import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import { kafkaService, LcaElementData } from "./KafkaService";

dotenv.config();

const app = express();

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5004"];
console.log("CORS Origins:", corsOrigins);

// Configure CORS
app.use(
  cors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// Add health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

const server = createServer(app);

// Configure WebSocket server with CORS
const wss = new WebSocketServer({
  server,
  verifyClient: (info, callback) => {
    const origin = info.origin || info.req.headers.origin;
    if (!origin || corsOrigins.includes(origin)) {
      callback(true);
    } else {
      console.log(
        "Rejected WebSocket connection from unauthorized origin:",
        origin
      );
      callback(false, 403, "Unauthorized origin");
    }
  },
});

// Validate required environment variables
// If MONGODB_URI is provided directly, we don't need individual credentials
const requiredEnvVars = ["MONGODB_URI"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error(
    `ERROR: Missing required environment variables: ${missingEnvVars.join(
      ", "
    )}`
  );
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

// After validation, we can safely assert these environment variables exist
// Ensure authSource=admin is used for MongoDB authentication
let MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI.includes("authSource=")) {
  MONGODB_URI += "?authSource=admin";
} else if (MONGODB_URI.includes("authSource=cost")) {
  MONGODB_URI = MONGODB_URI.replace("authSource=cost", "authSource=admin");
}
console.log(
  `Using MongoDB URI with authSource=admin: ${MONGODB_URI.replace(
    /:[^:]*@/,
    ":****@"
  )}`
); // Log sanitized URI

// Use defaults for username/password if not provided but needed
const MONGODB_USERNAME = process.env.MONGODB_USERNAME || "admin";
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || "secure_password";

// Configuration
const config = {
  websocket: {
    port: parseInt(process.env.WEBSOCKET_PORT || "8002"),
  },
  mongodb: {
    enabled: true,
    uri: MONGODB_URI,
    database: process.env.MONGODB_DATABASE || "lca",
    collections: {
      lcaResults: "lcaResults",
      materialLibrary: "materialLibrary",
      references: "references",
      materialEmissions: "materialEmissions",
      elementEmissions: "elementEmissions",
    },
    qtoDatabase: "qto",
    auth: {
      username: MONGODB_USERNAME,
      password: MONGODB_PASSWORD,
    },
  },
};

// Add MongoDB error type
interface MongoError extends Error {
  code?: number;
}

// Types for MongoDB objects
interface MongoIdObject {
  $oid: string;
}

// Add interface for Element
interface QtoElement {
  _id: string | ObjectId;
  project_id: string | ObjectId | { $oid: string };
  guid?: string;
  element_type?: string;
  quantity?: number;
  original_area?: number;
  status?: string;
  properties?: {
    materials?: {
      name: string;
      volume: string | number;
      unit?: string;
      fraction?: number;
    }[];
    [key: string]: any;
  };
  materials?: {
    name: string;
    volume: string | number;
    unit?: string;
    fraction?: number;
  }[];
  [key: string]: any;
}

// Add interface for Project
interface QtoProject {
  _id: string | ObjectId;
  name: string;
  description?: string;
  metadata?: {
    file_id?: string;
    filename?: string;
  };
  [key: string]: any;
}

// Helper to check if object has $oid property
function hasOid(obj: any): obj is { $oid: string } {
  return obj && typeof obj === "object" && "$oid" in obj;
}

// Helper to normalize material names by removing numbering patterns
function normalizeMaterialName(name: string): string {
  // Remove patterns like " (1)", " (2)", etc.
  return name.replace(/\s*\(\d+\)\s*$/, "");
}

// Update the connectToMongo function
async function connectToMongo() {
  let client: MongoClient | null = null;
  let db = null;

  try {
    console.log("Connecting to MongoDB...");

    // Try connecting with the main URI first
    try {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      console.log("Connected to MongoDB successfully using URI");

      db = client.db(config.mongodb.database);
    } catch (error: any) {
      console.warn(`Failed to connect using URI: ${error.message}`);
      console.log("Trying alternative connection method...");

      // Try connecting with explicit auth as fallback
      const fallbackUri = `mongodb://mongodb:27017/?authSource=admin`;
      client = new MongoClient(fallbackUri, {
        auth: {
          username: "admin",
          password: "secure_password",
        },
      });

      await client.connect();
      console.log("Connected to MongoDB using fallback credentials");

      db = client.db(config.mongodb.database);
    }

    if (!db) {
      throw new Error("Failed to establish database connection");
    }

    // Get list of existing collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(
      (col: { name: string }) => col.name
    );

    // Create collections if they don't exist
    for (const collectionName of Object.values(config.mongodb.collections)) {
      if (!collectionNames.includes(collectionName)) {
        console.log(`Creating collection: ${collectionName}`);
        await db.createCollection(collectionName);
      } else {
        console.log(`Collection ${collectionName} already exists`);
      }
    }

    // Create indexes if they don't exist
    const lcaResultsCollection = db.collection(
      config.mongodb.collections.lcaResults
    );
    const materialLibraryCollection = db.collection(
      config.mongodb.collections.materialLibrary
    );
    const referencesCollection = db.collection(
      config.mongodb.collections.references
    );

    // Create indexes with error handling
    try {
      await lcaResultsCollection.createIndex(
        { element_id: 1 },
        { unique: false }
      );
      console.log("Created index on lcaResults.element_id");
    } catch (error: unknown) {
      const mongoError = error as MongoError;
      if (mongoError.code !== 85) {
        // Ignore duplicate key error
        console.error("Error creating lcaResults index:", mongoError);
      }
    }

    try {
      await materialLibraryCollection.createIndex(
        { name: 1 },
        { unique: false }
      );
      console.log("Created index on materialLibrary.name");
    } catch (error: unknown) {
      const mongoError = error as MongoError;
      if (mongoError.code !== 85) {
        // Ignore duplicate key error
        console.error("Error creating materialLibrary index:", mongoError);
      }
    }

    try {
      await referencesCollection.createIndex(
        { reference_type: 1 },
        { unique: false }
      );
      console.log("Created index on references.reference_type");
    } catch (error: unknown) {
      const mongoError = error as MongoError;
      if (mongoError.code !== 85) {
        // Ignore duplicate key error
        console.error("Error creating references index:", mongoError);
      }
    }

    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

// Add this function after the connectToMongo function
async function sendElementEmissionsToKafka(
  elements: any[],
  projectName: string,
  filename: string = "unknown.ifc"
): Promise<boolean> {
  try {
    if (!elements || elements.length === 0) {
      console.log("No elements with emissions to send to Kafka");
      return false;
    }

    console.log(
      `Preparing to send ${elements.length} elements with LCA data to Kafka`
    );

    // Map elements to the format expected by Kafka
    const lcaElements: LcaElementData[] = elements.map((element, index) => {
      return {
        id: element.qto_element_id || element._id.toString(),
        category: element.ifc_class || "unknown",
        level: element.level || "",
        is_structural: element.is_structural || false,
        materials: Array.isArray(element.materials)
          ? element.materials.map((material: any) => ({
              name: material.name || "Unknown",
              volume: parseFloat(
                typeof material.volume === "string"
                  ? material.volume
                  : material.volume?.toString() || "0"
              ),
              impact: material.impact || undefined,
            }))
          : [],
        impact: element.impact || { gwp: 0, ubp: 0, penr: 0 },
        sequence: index,
      };
    });

    // Send data to Kafka
    const result = await kafkaService.sendLcaBatchToKafka(
      lcaElements,
      projectName,
      filename
    );

    if (result) {
      console.log(
        `Successfully sent ${lcaElements.length} LCA elements to Kafka`
      );
    } else {
      console.error("Failed to send LCA elements to Kafka");
    }

    return result;
  } catch (error) {
    console.error("Error sending element emissions to Kafka:", error);
    return false;
  }
}

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("Received message:", data);

      // Handle ping messages
      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", messageId: data.messageId }));
        return;
      }

      // Handle Kafka status request
      if (data.type === "get_kafka_status") {
        ws.send(
          JSON.stringify({
            type: "kafka_status",
            status: kafkaService.isKafkaConnected()
              ? "CONNECTED"
              : "DISCONNECTED",
            messageId: data.messageId,
          })
        );
        return;
      }

      // Handle test Kafka message request
      if (data.type === "send_test_kafka") {
        try {
          // Create a test LCA element
          const testElement = {
            id: `test_element_${Date.now()}`,
            category: "ifcwall",
            level: "Level 1",
            is_structural: true,
            materials: [
              {
                name: "Concrete",
                volume: 10,
                impact: {
                  gwp: 10.5,
                  ubp: 1050,
                  penr: 25.3,
                },
              },
            ],
            impact: {
              gwp: 10.5,
              ubp: 1050,
              penr: 25.3,
            },
            sequence: 0,
          };

          // Send test message to Kafka
          const result = await kafkaService.sendLcaDataToKafka(
            testElement,
            "Test Project",
            "test.ifc"
          );

          ws.send(
            JSON.stringify({
              type: "test_kafka_response",
              success: result,
              message: result
                ? "Test message sent successfully"
                : "Failed to send test message",
              messageId: data.messageId,
            })
          );
        } catch (error) {
          console.error("Error sending test Kafka message:", error);
          ws.send(
            JSON.stringify({
              type: "test_kafka_response",
              success: false,
              message: `Error: ${error}`,
              messageId: data.messageId,
            })
          );
        }
        return;
      }

      // Handle getting projects
      if (data.type === "get_projects") {
        try {
          // Connect to MongoDB and fetch projects from QTO database
          let client;
          let qtoDb;

          try {
            // Try main connection first
            client = new MongoClient(MONGODB_URI);
            await client.connect();
            qtoDb = client.db(config.mongodb.qtoDatabase);
          } catch (error: any) {
            console.warn(
              `Failed to connect using URI for projects: ${error.message}`
            );

            // Try fallback connection
            const fallbackUri = "mongodb://mongodb:27017/?authSource=admin";
            client = new MongoClient(fallbackUri, {
              auth: {
                username: "admin",
                password: "secure_password",
              },
            });
            await client.connect();
            qtoDb = client.db(config.mongodb.qtoDatabase);
          }

          const projects = (await qtoDb
            .collection("projects")
            .find({})
            .toArray()) as QtoProject[];

          // Map projects to the expected format
          const formattedProjects = projects.map((project: QtoProject) => ({
            id: project._id.toString(),
            name: project.name,
          }));

          console.log(
            "Retrieved projects from QTO database:",
            formattedProjects
          );

          ws.send(
            JSON.stringify({
              type: "projects",
              projects: formattedProjects,
              messageId: data.messageId,
            })
          );

          client.close();
        } catch (error) {
          console.error("Error fetching projects from QTO database:", error);

          // Fallback to hardcoded values if database access fails
          const fallbackProjects = [
            {
              id: "67e39d779606c4b7ed6793d0",
              name: "Gesamterneuerung Stadthausanlage",
            },
            {
              id: "67e391836c096bf72bc23d97",
              name: "Recyclingzentrum Juch-Areal",
            },
            { id: "67e391836c096bf72bc23d99", name: "Amtshaus Walche" },
            {
              id: "67e391836c096bf72bc23d9a",
              name: "Gemeinschaftszentrum Wipkingen",
            },
          ];

          ws.send(
            JSON.stringify({
              type: "projects",
              projects: fallbackProjects,
              messageId: data.messageId,
            })
          );
        }
        return;
      }

      // Handle getting project materials
      if (data.type === "get_project_materials") {
        try {
          const { projectId } = data;
          const db = await connectToMongo();

          // Try to get previously saved LCA results first, which might include EBF
          const lcaResultsCollection = db.collection(
            config.mongodb.collections.lcaResults
          );
          const savedLcaData = await lcaResultsCollection.findOne({
            projectId,
          });

          let projectName = "New Project";
          let projectElements: QtoElement[] = [];

          try {
            // Try main connection first
            let client;
            let qtoDb;

            try {
              client = new MongoClient(MONGODB_URI);
              await client.connect();
              qtoDb = client.db(config.mongodb.qtoDatabase);
            } catch (error: any) {
              console.warn(
                `Failed to connect using URI for project materials: ${error.message}`
              );

              // Try fallback connection
              const fallbackUri = "mongodb://mongodb:27017/?authSource=admin";
              client = new MongoClient(fallbackUri, {
                auth: {
                  username: "admin",
                  password: "secure_password",
                },
              });
              await client.connect();
              qtoDb = client.db(config.mongodb.qtoDatabase);
            }

            // Get project details
            const projectObjectId = new ObjectId(projectId);
            const project = (await qtoDb
              .collection("projects")
              .findOne({ _id: projectObjectId })) as QtoProject | null;

            if (project) {
              projectName = project.name;
              console.log(`Found project name in QTO database: ${projectName}`);

              // Get all elements for this project - the project_id might be stored as an ObjectId or as a string
              console.log(
                `Searching for elements with project_id: ${projectId} or ${projectObjectId}`
              );

              // Try first with ObjectId
              projectElements = (await qtoDb
                .collection("elements")
                .find({ project_id: projectObjectId })
                .toArray()) as QtoElement[];

              // If no elements found, try with string version
              if (projectElements.length === 0) {
                console.log(
                  "No elements found with ObjectId, trying with string project_id"
                );
                projectElements = (await qtoDb
                  .collection("elements")
                  .find({ project_id: projectId })
                  .toArray()) as QtoElement[];
              }

              // If still no elements found, try with the project_id as an object with $oid field
              if (projectElements.length === 0) {
                console.log(
                  "No elements found with string ID, trying with project_id as object"
                );
                projectElements = (await qtoDb
                  .collection("elements")
                  .find({ project_id: { $exists: true } })
                  .toArray()) as QtoElement[];

                // Filter the elements to match only those with matching project_id
                projectElements = projectElements.filter((el) => {
                  if (typeof el.project_id === "string") {
                    return el.project_id === projectId;
                  } else if (
                    el.project_id &&
                    typeof el.project_id === "object"
                  ) {
                    if (hasOid(el.project_id)) {
                      return el.project_id.$oid === projectId;
                    }
                    return (
                      el.project_id.toString() === projectObjectId.toString()
                    );
                  }
                  return false;
                });
              }

              console.log(
                `Found ${projectElements.length} elements for project ${projectName}`
              );

              // Log sample element to help debugging
              if (projectElements.length > 0) {
                console.log(
                  "Sample element:",
                  JSON.stringify(projectElements[0], null, 2)
                );
              }
            }

            client.close();
          } catch (error) {
            console.error("Error fetching project from QTO database:", error);
          }

          // Load materials from QTO database elements
          if (projectElements && projectElements.length > 0) {
            console.log("Creating material aggregation from elements");

            // Extract and aggregate materials from elements
            const materialMap = new Map<string, number>();

            projectElements.forEach((element: QtoElement) => {
              // Check if materials exist directly on the element (as in the example)
              if (Array.isArray(element.materials)) {
                element.materials.forEach((material) => {
                  if (material && typeof material === "object") {
                    // Normalize the material name to remove numbering
                    const name = normalizeMaterialName(
                      material.name || "Unknown"
                    );
                    const volume = parseFloat(
                      typeof material.volume === "string"
                        ? material.volume
                        : material.volume?.toString() || "0"
                    );

                    if (!isNaN(volume) && volume > 0) {
                      if (materialMap.has(name)) {
                        materialMap.set(
                          name,
                          (materialMap.get(name) || 0) + volume
                        );
                      } else {
                        materialMap.set(name, volume);
                      }
                    }
                  }
                });
              }
              // Also check if materials exist in properties (as in the previous implementation)
              else if (
                element.properties &&
                Array.isArray(element.properties.materials)
              ) {
                element.properties.materials.forEach((material) => {
                  if (material && typeof material === "object") {
                    // Normalize the material name to remove numbering
                    const name = normalizeMaterialName(
                      material.name || "Unknown"
                    );
                    const volume = parseFloat(
                      typeof material.volume === "string"
                        ? material.volume
                        : material.volume?.toString() || "0"
                    );

                    if (!isNaN(volume) && volume > 0) {
                      if (materialMap.has(name)) {
                        materialMap.set(
                          name,
                          (materialMap.get(name) || 0) + volume
                        );
                      } else {
                        materialMap.set(name, volume);
                      }
                    }
                  }
                });
              }
            });

            // Convert to array format expected by frontend
            const materials = Array.from(materialMap).map(([name, volume]) => ({
              name,
              volume,
            }));

            console.log(`Aggregated ${materials.length} unique materials`);
            console.log("Material list:", materials);

            // Return aggregated materials and saved EBF/Mappings
            ws.send(
              JSON.stringify({
                type: "project_materials",
                projectId,
                name: projectName,
                ifcData: { materials }, // Send aggregated materials from QTO
                materialMappings: savedLcaData?.materialMappings || {}, // Use saved mappings if available
                ebf: savedLcaData?.ebf || null, // Send saved EBF value
                messageId: data.messageId,
              })
            );
          }
          // If no elements found, return empty structure
          else {
            ws.send(
              JSON.stringify({
                type: "project_materials",
                projectId,
                name: projectName,
                ifcData: { materials: [] },
                materialMappings: {},
                ebf: null,
                messageId: data.messageId,
              })
            );
          }
        } catch (error) {
          console.error("Error fetching project materials:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Failed to fetch project materials",
              messageId: data.messageId,
            })
          );
        }
      }

      // Handle saving project materials
      if (data.type === "save_project_materials") {
        try {
          // Add ebfValue to the destructured data
          const { projectId, ifcData, materialMappings, ebfValue } = data;
          const db = await connectToMongo();
          const collection = db.collection(
            config.mongodb.collections.lcaResults
          );

          // Parse EBF to float or null
          const ebfNumeric = ebfValue ? parseFloat(ebfValue) : null;
          const finalEbf =
            ebfNumeric !== null && !isNaN(ebfNumeric) && ebfNumeric > 0
              ? ebfNumeric
              : null;

          console.log(`Saving data for project ${projectId}, EBF: ${finalEbf}`);

          // Update or insert materials, mappings, AND EBF
          await collection.updateOne(
            { projectId },
            {
              $set: {
                projectId,
                ifcData,
                materialMappings,
                ebf: finalEbf, // Store numeric EBF or null
                lastUpdated: new Date(),
              },
            },
            { upsert: true }
          );

          // Save material emissions data
          if (ifcData && ifcData.materials) {
            const materialEmissionsCollection = db.collection(
              config.mongodb.collections.materialEmissions
            );

            // Create a document with project materials and their emissions
            await materialEmissionsCollection.updateOne(
              { projectId },
              {
                $set: {
                  projectId,
                  materials: ifcData.materials,
                  materialMappings,
                  totalImpact: ifcData.totalImpact || {},
                  lastUpdated: new Date(),
                },
              },
              { upsert: true }
            );
          }

          // Now fetch all QTO elements for this project and calculate emissions
          try {
            // Connect to QTO database
            let client;
            let qtoDb;

            try {
              // Try main connection first
              client = new MongoClient(MONGODB_URI);
              await client.connect();
              qtoDb = client.db(config.mongodb.qtoDatabase);
            } catch (error: any) {
              console.warn(
                `Failed to connect using URI for saving project: ${error.message}`
              );

              // Try fallback connection
              const fallbackUri = "mongodb://mongodb:27017/?authSource=admin";
              client = new MongoClient(fallbackUri, {
                auth: {
                  username: "admin",
                  password: "secure_password",
                },
              });
              await client.connect();
              qtoDb = client.db(config.mongodb.qtoDatabase);
            }

            // Convert projectId to ObjectId for query
            const projectObjectId = new ObjectId(projectId);

            // Get all elements for this project
            const qtoElements = await qtoDb
              .collection("elements")
              .find({ project_id: projectObjectId })
              .toArray();

            console.log(
              `Found ${qtoElements.length} QTO elements for project ${projectId}`
            );

            // Create an array to hold elements with emissions
            const elementsWithEmissions = [];

            // For each QTO element, calculate emissions based on material mappings
            for (const qtoElement of qtoElements) {
              if (!qtoElement.materials || qtoElement.materials.length === 0) {
                // Skip elements without materials
                continue;
              }

              // Create element with emissions
              const elementWithEmissions = {
                qto_element_id: qtoElement._id.toString(), // Store original QTO element ID as reference
                project_id: projectId,
                ifc_id: qtoElement.ifc_id,
                global_id: qtoElement.global_id,
                ifc_class: qtoElement.ifc_class,
                name: qtoElement.name,
                type_name: qtoElement.type_name,
                level: qtoElement.level,
                quantity: qtoElement.quantity,
                original_quantity: qtoElement.original_quantity,
                is_structural: qtoElement.is_structural,
                is_external: qtoElement.is_external,
                classification: qtoElement.classification,
                materials: qtoElement.materials,
                impact: {
                  gwp: 0,
                  ubp: 0,
                  penr: 0,
                },
              };

              // Calculate impacts for this element
              for (const material of qtoElement.materials) {
                // Normalize material name to find matches
                const normalizedMaterialName = normalizeMaterialName(
                  material.name
                );

                // Find if we have a matching material in the materialMappings
                const matchingMaterialId = Object.entries(
                  materialMappings
                ).find(([id, kbobId]) => {
                  // Find the material in ifcData.materials by id
                  const mappedMaterial = ifcData.materials.find(
                    (m: any) => m.id === id
                  );
                  if (mappedMaterial) {
                    return (
                      normalizeMaterialName(mappedMaterial.name) ===
                      normalizedMaterialName
                    );
                  }
                  return false;
                });

                if (matchingMaterialId) {
                  // We found a mapping for this material
                  const [materialId, kbobId] = matchingMaterialId;

                  // Find the material in the ifcData.elements that has this materialId
                  const matchedElement = ifcData.elements.find((element: any) =>
                    element.materials.some(
                      (m: any) =>
                        normalizeMaterialName(m.name) === normalizedMaterialName
                    )
                  );

                  if (matchedElement && matchedElement.impact) {
                    // Calculate the material's proportion of the impact
                    const materialVolume = parseFloat(
                      typeof material.volume === "string"
                        ? material.volume
                        : material.volume?.toString() || "0"
                    );

                    const totalMaterialVolume = matchedElement.materials.reduce(
                      (sum: number, m: any) =>
                        sum +
                        (typeof m.volume === "number"
                          ? m.volume
                          : parseFloat(m.volume?.toString() || "0")),
                      0
                    );

                    const volumeRatio = materialVolume / totalMaterialVolume;

                    // Add proportional impact to the element
                    elementWithEmissions.impact.gwp +=
                      matchedElement.impact.gwp * volumeRatio;
                    elementWithEmissions.impact.ubp +=
                      matchedElement.impact.ubp * volumeRatio;
                    elementWithEmissions.impact.penr +=
                      matchedElement.impact.penr * volumeRatio;
                  }
                }
              }

              // Add element with calculated emissions to array
              elementsWithEmissions.push(elementWithEmissions);
            }

            // Save all elements with emissions to the elementEmissions collection
            if (elementsWithEmissions.length > 0) {
              const elementEmissionsCollection = db.collection(
                config.mongodb.collections.elementEmissions
              );

              // First, remove all existing element emissions for this project
              await elementEmissionsCollection.deleteMany({
                project_id: projectId,
              });

              // Insert each element as a separate document
              try {
                // Remove _id and add QTO references before insertion
                const elementsToInsert = elementsWithEmissions.map(
                  (element) => {
                    // Create clean version of element without _id field (MongoDB will generate one)
                    const { impact, ...rest } = element;

                    return {
                      ...rest,
                      impact: {
                        gwp: impact.gwp,
                        ubp: impact.ubp,
                        penr: impact.penr,
                      },
                      calculated_at: new Date(),
                    };
                  }
                );

                // Insert all elements as individual documents
                await elementEmissionsCollection.insertMany(elementsToInsert);

                // Also store the total impact in a separate summary document
                await elementEmissionsCollection.updateOne(
                  { projectId, document_type: "summary" },
                  {
                    $set: {
                      projectId,
                      document_type: "summary",
                      totalImpact: ifcData.totalImpact || {},
                      lastUpdated: new Date(),
                      elementCount: elementsWithEmissions.length,
                    },
                  },
                  { upsert: true }
                );

                console.log(
                  `Saved ${elementsWithEmissions.length} elements with emissions to database as individual documents`
                );

                // Get project info to extract filename
                let projectName = "Unknown Project";
                let filename = "unknown.ifc";
                try {
                  const project = await qtoDb.collection("projects").findOne({
                    _id: projectObjectId,
                  });

                  if (project) {
                    projectName = project.name || projectName;
                    if (project.metadata && project.metadata.filename) {
                      filename = project.metadata.filename;
                    }
                  }
                } catch (error) {
                  console.warn("Could not get project details:", error);
                }

                // Send all elements with emissions to Kafka
                await sendElementEmissionsToKafka(
                  elementsWithEmissions,
                  projectName,
                  filename
                );
              } catch (insertError) {
                console.error(
                  "Error inserting element documents:",
                  insertError
                );
              }
            }

            // Close QTO database connection
            await client.close();
          } catch (error) {
            console.error("Error processing QTO elements:", error);
          }

          ws.send(
            JSON.stringify({
              type: "materials_saved",
              projectId,
              messageId: data.messageId,
            })
          );
        } catch (error) {
          console.error("Error saving project materials:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Failed to save project materials",
              messageId: data.messageId,
            })
          );
        }
      }

      // Handle sending LCA data through Kafka
      if (data.type === "send_lca_data") {
        try {
          const { projectId, elements } = data;

          if (!projectId || !elements || !Array.isArray(elements)) {
            console.error("Invalid send_lca_data payload:", data);
            ws.send(
              JSON.stringify({
                type: "send_lca_data_response",
                status: "error",
                message: "Invalid payload. Missing projectId or elements.",
                messageId: data.messageId,
              })
            );
            return;
          }

          console.log(
            `Received request to send LCA data for project ${projectId} with ${elements.length} elements`
          );

          // Get project info to extract filename
          let projectName = "Unknown Project";
          let filename = "unknown.ifc";

          try {
            // Connect to QTO database
            let client;
            let qtoDb;

            try {
              // Try main connection first
              client = new MongoClient(MONGODB_URI);
              await client.connect();
              qtoDb = client.db(config.mongodb.qtoDatabase);
            } catch (error: any) {
              console.warn(
                `Failed to connect using URI for project info: ${error.message}`
              );

              // Try fallback connection
              const fallbackUri = "mongodb://mongodb:27017/?authSource=admin";
              client = new MongoClient(fallbackUri, {
                auth: {
                  username: "admin",
                  password: "secure_password",
                },
              });
              await client.connect();
              qtoDb = client.db(config.mongodb.qtoDatabase);
            }

            // Get project details
            const projectObjectId = new ObjectId(projectId);
            const project = await qtoDb
              .collection("projects")
              .findOne({ _id: projectObjectId });

            if (project) {
              projectName = project.name || projectName;
              if (project.metadata && project.metadata.filename) {
                filename = project.metadata.filename;
              }
            }

            // Close connection
            await client.close();
          } catch (error) {
            console.warn("Could not get project details:", error);
          }

          // Send data to Kafka
          const result = await kafkaService.sendLcaBatchToKafka(
            elements,
            projectName,
            filename
          );

          // Send response
          ws.send(
            JSON.stringify({
              type: "send_lca_data_response",
              status: result ? "success" : "error",
              message: result
                ? "LCA data sent successfully"
                : "Failed to send LCA data",
              elementCount: elements.length,
              messageId: data.messageId,
            })
          );
        } catch (error) {
          console.error("Error sending LCA data to Kafka:", error);
          ws.send(
            JSON.stringify({
              type: "send_lca_data_response",
              status: "error",
              message: `Error: ${error}`,
              messageId: data.messageId,
            })
          );
        }
        return;
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Failed to process request",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  // Send a welcome message
  ws.send(
    JSON.stringify({
      type: "connected",
      message: "Connected to LCA WebSocket server",
    })
  );
});

// Start server
const port = config.websocket.port;
server.listen(port, async () => {
  console.log(`Server running on port ${port}`);

  try {
    // Initialize Kafka
    console.log("Initializing Kafka connection...");
    const kafkaInitialized = await kafkaService.initialize();

    if (kafkaInitialized) {
      console.log("Kafka initialized successfully");

      // Set up Kafka consumer to listen for QTO element updates
      const consumerCreated = await kafkaService.createConsumer(
        async (messageData) => {
          try {
            // Check if this is a PROJECT_UPDATED notification
            if (messageData.eventType === "PROJECT_UPDATED") {
              console.log(
                `Received PROJECT_UPDATED notification for project: ${messageData.payload.projectName} (ID: ${messageData.payload.projectId})`
              );
              // Handle project updates if needed
            } else {
              // Handle individual element messages
              console.log("Received element data, processing...");
              // Process element data if needed
            }
          } catch (error) {
            console.error("Error processing Kafka message:", error);
          }
        }
      );

      if (consumerCreated) {
        console.log("Kafka consumer created and running");
      } else {
        console.error("Failed to create Kafka consumer");
      }
    } else {
      console.error("Failed to initialize Kafka");
    }
  } catch (error) {
    console.error("Error during Kafka setup:", error);
  }
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");

  // Disconnect Kafka
  await kafkaService.disconnect();

  // Close the server
  server.close(() => {
    console.log("Server shut down");
    process.exit(0);
  });
});
