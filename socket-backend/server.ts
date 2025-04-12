import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { MongoClient, ObjectId, Db } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import { kafkaService, LcaElementData, KafkaMetadata } from "./KafkaService";
import fs from "fs";
import path from "path";
import { seedKbobData } from "./dbSeeder";
import { config } from "./config"; // Import shared config

dotenv.config();

// REMOVED local config definition

// RESTORED Express app and CORS setup
const app = express();

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter((o) => o) // Trim and filter empty
  : ["http://localhost:5004"]; // Default if not set
console.log("CORS Origins:", corsOrigins);

// Configure CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (corsOrigins.includes("*") || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      const msg =
        "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    },
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
    if (!origin) {
      // Allow connections with no origin (e.g. from backend services, tests)
      return callback(true);
    }
    if (corsOrigins.includes("*") || corsOrigins.includes(origin)) {
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

// Validate required environment variables from imported config
if (!config.mongodb.uri) {
  console.error(`ERROR: Missing required environment variable: MONGODB_URI`);
  throw new Error(`Missing required environment variable: MONGODB_URI`);
}

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
  ifc_id?: string;
  global_id?: string;
  guid?: string;
  ifc_class?: string;
  name?: string;
  type_name?: string;
  level?: string;
  element_type?: string;
  quantity?: { value: number; type: string; unit: string };
  original_quantity?: { value: number; type: string };
  original_area?: number;
  status?: string;
  is_structural?: boolean;
  is_external?: boolean;
  classification?: { id: string; name: string; system: string };
  properties?: { [key: string]: any };
  materials?: {
    name: string;
    volume: string | number;
    unit?: string;
    fraction?: number;
  }[];
  created_at?: Date;
  updated_at?: Date;
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

// Function to connect to both databases (uses imported config)
async function connectToDatabases(): Promise<{
  lcaDb: Db;
  qtoDb: Db;
  client: MongoClient;
}> {
  let client: MongoClient | null = null;
  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(config.mongodb.uri);
    await client.connect();
    console.log("MongoDB Client Connected");
    const lcaDb: Db = client.db(config.mongodb.database);
    const qtoDb: Db = client.db(config.mongodb.qtoDatabase);
    await seedKbobData(lcaDb);
    console.log("Connected to LCA and QTO databases.");
    return { lcaDb, qtoDb, client };
  } catch (error) {
    console.error("Failed to connect/seed DB:", error);
    if (client) await client.close();
    throw error;
  }
}

// Add a simple in-memory store for project metadata near the top
const projectMetadataStore: Record<
  string,
  { project: string; filename: string; timestamp: string; fileId: string }
> = {};

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    let dbClient: MongoClient | null = null;
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
          const testElement: LcaElementData = {
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

          // Create placeholder metadata for the test message
          const testKafkaMetadata: KafkaMetadata = {
            project: "Test Project",
            filename: "test.ifc",
            timestamp: new Date().toISOString(),
            fileId: `test_${Date.now()}`, // Corrected Date usage
          };

          // Corrected: Send test message using the service and metadata object
          const testTotals = { totalGwp: 0, totalUbp: 0, totalPenr: 0 };
          const result = await kafkaService.sendLcaBatchToKafka(
            [testElement],
            testKafkaMetadata,
            testTotals
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
            client = new MongoClient(config.mongodb.uri);
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
          const { lcaDb, qtoDb, client } = await connectToDatabases();
          dbClient = client;

          // Try to get previously saved LCA results first, which might include EBF
          const lcaResultsCollection = lcaDb.collection(
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
              client = new MongoClient(config.mongodb.uri);
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
                .find({
                  project_id: projectObjectId,
                  status: "active", // Only use elements that have been approved
                })
                .toArray()) as QtoElement[];

              // If the first query didn't return any elements, try with string ID
              if (projectElements.length === 0) {
                projectElements = (await qtoDb
                  .collection("elements")
                  .find({
                    project_id: projectId,
                    status: "active", // Only use elements that have been approved
                  })
                  .toArray()) as QtoElement[];
                console.log(
                  `Found ${projectElements.length} elements using string project_id`
                );
              }

              // If still no elements found, try with the project_id as an object with $oid field
              if (projectElements.length === 0) {
                console.log(
                  "No elements found with string ID, trying with project_id as object"
                );
                projectElements = (await qtoDb
                  .collection("elements")
                  .find({
                    project_id: { $exists: true },
                    status: "active", // Only use elements that have been approved
                  })
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
                `Found ${projectElements.length} active elements for project ${projectName}`
              );

              // Also check for pending elements that were excluded
              const pendingElements = await qtoDb
                .collection("elements")
                .countDocuments({
                  project_id: projectObjectId,
                  status: "pending",
                });

              if (pendingElements > 0) {
                console.log(
                  `NOTE: Skipped ${pendingElements} pending elements that haven't been approved yet for project ${projectName}`
                );
              }

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
        } finally {
          if (dbClient) {
            await dbClient.close();
          }
        }
      }

      // Handle saving project materials
      if (data.type === "save_project_materials") {
        console.log(
          `>>> ENTERING save_project_materials handler. Message ID: ${
            data.messageId
          }, Project ID: ${
            data.projectId
          }, Timestamp: ${new Date().toISOString()}`
        );
        const { projectId, ifcData, materialMappings, ebfValue } = data;
        if (!projectId) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Missing projectId",
              messageId: data.messageId,
            })
          );
          return;
        }

        const { lcaDb, qtoDb, client } = await connectToDatabases();
        dbClient = client;

        // Fetch QTO Project Metadata
        let kafkaMetadata: KafkaMetadata | null = null;
        try {
          const qtoProject = await qtoDb.collection("projects").findOne(
            { _id: new ObjectId(projectId) },
            {
              projection: {
                name: 1,
                metadata: 1,
                created_at: 1,
                updated_at: 1,
              },
            }
          );
          if (qtoProject) {
            const fileProcessingTimestamp =
              qtoProject.metadata?.fileProcessingTimestamp ||
              qtoProject.updated_at ||
              qtoProject.created_at ||
              new Date();
            kafkaMetadata = {
              project: qtoProject.name || `Project_${projectId}`,
              filename: qtoProject.metadata?.filename || "unknown.ifc",
              timestamp: new Date(fileProcessingTimestamp).toISOString(),
              fileId: qtoProject.metadata?.file_id || projectId.toString(),
            };
          } else {
            console.error(
              `QTO Project metadata not found for ID: ${projectId}`
            );
          }
        } catch (error) {
          console.error(`Error fetching QTO project metadata: ${error}`);
        }

        if (!kafkaMetadata) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Failed to fetch project metadata for Kafka message.",
              messageId: data.messageId,
            })
          );
          return;
        }

        // Save LCA Results
        const lcaResultsCollection = lcaDb.collection(
          config.mongodb.collections.lcaResults
        );
        const ebfNumeric = ebfValue ? parseFloat(ebfValue) : null;
        const finalEbf =
          ebfNumeric !== null && !isNaN(ebfNumeric) && ebfNumeric > 0
            ? ebfNumeric
            : null;
        await lcaResultsCollection.updateOne(
          { projectId },
          {
            $set: {
              projectId,
              ifcData: {
                // Store calculated impacts and materials used for LCA
                materials: ifcData?.materials || [],
                totalImpact: ifcData?.totalImpact || {
                  gwp: 0,
                  ubp: 0,
                  penr: 0,
                },
              },
              materialMappings: materialMappings || {},
              ebf: finalEbf,
              lastUpdated: new Date(),
            },
          },
          { upsert: true }
        );
        console.log(
          `Saved/Updated LCA results summary for project ${projectId}`
        );

        // --- Refactored Emission Calculation: Per Material Instance ---
        const qtoElements = await qtoDb
          .collection("elements")
          .find<QtoElement>({
            project_id: new ObjectId(projectId),
            status: "active",
          })
          .toArray();
        console.log(
          `Found ${qtoElements.length} active QTO elements for emission calculation.`
        );

        const materialInstancesWithEmissions: any[] = []; // New array for material instances
        const materialLibrary = await lcaDb
          .collection("materialLibrary")
          .find({})
          .toArray();
        const kbobMap = new Map(materialLibrary.map((m) => [m.id, m]));

        let totalGwp = 0,
          totalUbp = 0,
          totalPenr = 0;

        for (const qtoElement of qtoElements) {
          const materialsInElement = qtoElement.materials || [];
          const elementGlobalId = qtoElement.global_id; // Get element's global ID
          const elementIdStr = qtoElement._id.toString(); // Get element's MongoDB ID
          let materialSequence = 0; // Initialize sequence counter for this element

          if (
            !Array.isArray(materialsInElement) ||
            materialsInElement.length === 0
          ) {
            console.log(
              `  [Elem: ${elementIdStr}] No materials array found or empty, skipping.`
            );
            continue; // Skip elements without materials
          }

          for (const material of materialsInElement) {
            if (!material || typeof material.name !== "string") {
              console.log(
                `  [Elem: ${elementIdStr}] Skipping invalid material entry:`,
                material
              );
              continue; // Skip invalid material entries
            }

            const normalizedQtoMatName = normalizeMaterialName(material.name);
            let mappedKbobId: string | null = null;
            let materialImpact = { gwp: 0, ubp: 0, penr: 0 }; // Impact for this specific material instance

            // Log material being processed
            console.log(
              `  [Elem: ${elementIdStr} / ${
                elementGlobalId || "No GlobalID"
              }] Processing material: '${
                material.name
              }' (Normalized QTO: '${normalizedQtoMatName}')`
            );

            // Find KBOB mapping
            for (const [currentModelMatId, kbobId] of Object.entries(
              materialMappings || {}
            )) {
              const normalizedModelMatId =
                normalizeMaterialName(currentModelMatId);
              if (normalizedModelMatId === normalizedQtoMatName) {
                mappedKbobId = kbobId as string;
                console.log(
                  `    --> Match found! Mapped KBOB ID: ${mappedKbobId}`
                );
                break;
              }
            }

            // Calculate impact if mapped
            if (mappedKbobId) {
              const kbobMat = kbobMap.get(mappedKbobId);
              if (kbobMat) {
                const volume = parseFloat(material.volume?.toString() || "0");
                const density = kbobMat.density || 0;
                if (
                  !isNaN(volume) &&
                  volume > 0 &&
                  !isNaN(density) &&
                  density > 0
                ) {
                  const mass = volume * density;
                  materialImpact.gwp = mass * (kbobMat.gwp || 0);
                  materialImpact.ubp = mass * (kbobMat.ubp || 0);
                  materialImpact.penr = mass * (kbobMat.penr || 0);
                  console.log(
                    `    --> Calculated Impacts: GWP=${materialImpact.gwp.toFixed(
                      2
                    )}, UBP=${materialImpact.ubp.toFixed(
                      2
                    )}, PENR=${materialImpact.penr.toFixed(2)}`
                  );
                  // Add to totals
                  totalGwp += materialImpact.gwp;
                  totalUbp += materialImpact.ubp;
                  totalPenr += materialImpact.penr;
                } else {
                  console.log(
                    `    --> Skipping calculation: Invalid volume (${volume}) or density (${density}).`
                  );
                }
              } else {
                console.log(
                  `    --> KBOB data not found in kbobMap for mapped ID: ${mappedKbobId}`
                );
              }
            } else {
              console.log(`    --> No KBOB mapping found.`);
            }

            // Add material instance to the list
            materialInstancesWithEmissions.push({
              element_id: elementIdStr, // Original element MongoDB ID
              global_id: elementGlobalId, // Original element GlobalID (prioritized for Kafka ID)
              ifc_class: qtoElement.ifc_class,
              level: qtoElement.level,
              is_structural: qtoElement.is_structural,
              material_name: material.name, // Specific material name
              material_volume: parseFloat(material.volume?.toString() || "0"),
              kbob_id: mappedKbobId || "UNKNOWN_KBOB", // KBOB ID for this material
              impact: materialImpact, // Calculated impact for this material instance
              sequence: materialSequence++, // Assign and increment sequence for this material
            });
          } // End loop through materials in element
        } // End loop through elements

        console.log(
          `Processed ${materialInstancesWithEmissions.length} material instances.`
        );
        const totals = { totalGwp, totalUbp, totalPenr };
        console.log("Calculated Totals:", totals);

        // --- Temporarily removing DB saving of emissions ---
        /*
        // Save element emissions (Needs refactoring for material-based storage)
        if (elementsWithEmissions.length > 0) {
          const elementEmissionsCollection = lcaDb.collection(
            config.mongodb.collections.elementEmissions
          );
          // This needs to be adapted to store materialInstancesWithEmissions
          await elementEmissionsCollection.deleteMany({ project_id: projectId });
          await elementEmissionsCollection.insertMany(elementsWithEmissions);
          console.log(
            `Saved ${elementsWithEmissions.length} element emissions to DB.`
          );
        }
        */

        // --- Prepare data for Kafka ---
        console.log(
          "Material Instances Prepared for Kafka:",
          JSON.stringify(materialInstancesWithEmissions, null, 2)
        );

        // Check if there's anything to send
        if (materialInstancesWithEmissions.length === 0 || !kafkaMetadata) {
          console.log(
            "No material instances with emissions calculated or missing Kafka metadata. Skipping Kafka send."
          );
          ws.send(
            JSON.stringify({
              type: "materials_saved", // Or a more specific status
              projectId,
              message:
                "LCA summary saved. No material emissions calculated or metadata missing.",
              messageId: data.messageId,
            })
          );
        } else {
          // Send the flat list of material instances to Kafka
          await kafkaService.sendLcaBatchToKafka(
            materialInstancesWithEmissions, // Pass the material instances list
            kafkaMetadata,
            totals
          );

          ws.send(
            JSON.stringify({
              type: "materials_saved",
              projectId,
              message: `LCA summary saved. Sent ${materialInstancesWithEmissions.length} material instances to Kafka.`, // Updated message
              messageId: data.messageId,
            })
          );
        }
      } // End 'save_project_materials' handler

      // SEND_LCA_DATA handler (Needs similar refactoring if used)
      if (data.type === "send_lca_data") {
        // TODO: This handler also needs refactoring to expect and process
        // a flat list of material instances if it's intended to be used.
        // For now, it remains element-based.
        const { projectId, elements } = data.payload;
        if (!projectId || !elements || !Array.isArray(elements)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid payload",
              messageId: data.messageId,
            })
          );
          return;
        }

        const { qtoDb, client } = await connectToDatabases();
        dbClient = client;

        // Fetch QTO Project Metadata
        let kafkaMetadata: KafkaMetadata | null = null;
        try {
          const qtoProject = await qtoDb.collection("projects").findOne(
            { _id: new ObjectId(projectId) },
            {
              projection: {
                name: 1,
                metadata: 1,
                created_at: 1,
                updated_at: 1,
              },
            }
          );
          if (qtoProject) {
            const fileProcessingTimestamp =
              qtoProject.metadata?.fileProcessingTimestamp ||
              qtoProject.updated_at ||
              qtoProject.created_at ||
              new Date();
            kafkaMetadata = {
              project: qtoProject.name || `Project_${projectId}`,
              filename: qtoProject.metadata?.filename || "unknown.ifc",
              timestamp: new Date(fileProcessingTimestamp).toISOString(),
              fileId: qtoProject.metadata?.file_id || projectId.toString(),
            };
          } else {
            console.error(
              `Metadata not found for project ${projectId} (send_lca_data)`
            );
          }
        } catch (error) {
          console.error(
            `Error fetching QTO project metadata (send_lca_data): ${error}`
          );
        }
        if (!kafkaMetadata) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Failed to fetch project metadata for Kafka message.",
              messageId: data.messageId,
            })
          );
          return;
        }

        // Map input elements to LcaElementData format
        const lcaElementsForKafka: LcaElementData[] = elements.map(
          (element: any, index: number) => {
            // Prioritize global_id, then qto_element_id, then _id, then element.id
            const id =
              element.global_id ||
              element.qto_element_id ||
              element._id?.toString() ||
              element.id ||
              `unknown_${index}`;
            console.log(
              `[Kafka Map - send_lca_data] Mapping element. ID: ${id}`
            ); // Log ID selection
            return {
              id: id, // Use prioritized ID
              category: element.ifc_class || element.category || "unknown",
              level: element.level || "",
              is_structural: element.is_structural ?? false,
              materials: (element.materials || []).map((material: any) => ({
                name: material.name || "Unknown",
                volume: parseFloat(
                  typeof material.volume === "string"
                    ? material.volume
                    : material.volume?.toString() || "0"
                ),
                impact: material.impact || undefined, // Include material impact if provided
              })),
              impact: element.impact || { gwp: 0, ubp: 0, penr: 0 },
              mat_kbob:
                element.mat_kbob || element.primaryKbobId || "UNKNOWN_KBOB", // Pass KBOB ID if available in input
              sequence: index,
            };
          }
        );

        // Calculate totals
        let totalGwp = 0,
          totalUbp = 0,
          totalPenr = 0;
        for (const element of lcaElementsForKafka) {
          totalGwp += element.impact.gwp;
          totalUbp += element.impact.ubp;
          totalPenr += element.impact.penr;
        }
        const totals = { totalGwp, totalUbp, totalPenr };

        // Corrected: Directly call kafkaService.sendLcaBatchToKafka with 3 arguments
        const result = await kafkaService.sendLcaBatchToKafka(
          lcaElementsForKafka,
          kafkaMetadata,
          totals
        );

        // Send response back to client
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
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({ type: "error", message: "Failed to process request" })
      );
    } finally {
      if (dbClient) {
        await dbClient.close();
      }
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    ws.send(
      JSON.stringify({
        type: "connected",
        message: "Connected to LCA WebSocket server",
      })
    );
  });
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
              const { projectId, projectName, filename, timestamp, fileId } =
                messageData.payload;
              console.log(
                `Received PROJECT_UPDATED notification for project: ${projectName} (ID: ${projectId})`
              );

              // Store the metadata received from the QTO producer
              if (projectId) {
                projectMetadataStore[projectId] = {
                  project: projectName,
                  filename: filename || "unknown.ifc", // Use filename from payload
                  timestamp: timestamp, // Use original timestamp from payload
                  fileId: fileId || projectId, // Use fileId from payload
                };
                console.log(
                  `Stored metadata for projectId ${projectId}:`,
                  projectMetadataStore[projectId]
                );
              }

              // TODO: Potentially trigger LCA calculation based on this update notification
              // This might involve fetching elements for projectId from the DB
              // and then proceeding with LCA calculation + sending results.
            } else {
              // Handle legacy element messages if necessary, or log/ignore
              console.log(
                "Received non-PROJECT_UPDATED message, skipping detailed processing in LCA for now."
              );
            }
          } catch (error) {
            console.error("Error processing Kafka message in LCA:", error);
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
