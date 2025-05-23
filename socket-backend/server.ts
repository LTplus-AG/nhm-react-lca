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
import { LcaCalculationService } from "./LcaCalculationService";
import { KbobMaterial, MaterialInstanceResult } from "./types";

// Add variables to hold the DB connection (declared after imports)
let lcaDbInstance: Db | null = null;
let mongoClientInstance: MongoClient | null = null;

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

// Add API endpoint to fetch KBOB materials
app.get("/api/kbob/materials", async (req, res) => {
  // Use the globally established DB connection
  if (!lcaDbInstance) {
    console.error("API Error: MongoDB connection not available.");
    return res.status(503).json({ message: "Database connection unavailable" });
  }

  try {
    // Assert type here as Db, since it should be assigned at startup
    const db = lcaDbInstance as Db;
    const materialLibraryCollection = db.collection(
      config.mongodb.collections.materialLibrary
    );
    const materials = await materialLibraryCollection.find({}).toArray();
    res.status(200).json(materials);
  } catch (error) {
    console.error("Error fetching KBOB materials from DB:", error);
    res.status(500).json({ message: "Failed to fetch KBOB materials" });
  }
  // Do NOT close the client here, it's managed globally
});

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
    upload_timestamp?: string;
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
      console.log("Received message type:", data.type); // Log only type initially

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

          // Use deprecated method for backwards compatibility with test
          const testTotals = { totalGwp: 0, totalUbp: 0, totalPenr: 0 };
          const result = await kafkaService.sendLcaBatchToKafkaLegacy(
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
          let projectMetadata: {
            filename: string;
            upload_timestamp: string;
          } | null = null;

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
              projectMetadata = {
                filename: project.metadata?.filename || "Unbekannte Datei",
                upload_timestamp: project.metadata?.upload_timestamp || "",
              };
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
            const materialMap = new Map<string, number>();

            projectElements.forEach((element: QtoElement) => {
              const materialsArray = element.materials; // Get the array

              if (Array.isArray(materialsArray) && materialsArray.length > 0) {
                materialsArray.forEach((material) => {
                  if (
                    material &&
                    typeof material === "object" &&
                    typeof material.name === "string"
                  ) {
                    const name = normalizeMaterialName(material.name);
                    const volume = parseFloat(
                      typeof material.volume === "string"
                        ? material.volume
                        : material.volume?.toString() || "0"
                    );

                    if (!isNaN(volume) && volume > 0) {
                      materialMap.set(
                        name,
                        (materialMap.get(name) || 0) + volume
                      );
                    } else {
                      // Optional: Log materials with zero/invalid volume if needed
                      // console.log(`Skipping material '${name}' in element ${element._id} due to zero/invalid volume: ${material.volume}`);
                    }
                  } else {
                    // Optional: Log if a material entry is invalid
                    // console.warn(`Invalid material entry in element ${element._id}:`, material);
                  }
                });
              } else {
                // Optional: Log elements with no materials array or empty array
                // console.log(`Element ${element._id} has no materials or an empty materials array.`);
              }
            });

            // Convert to array format expected by frontend
            const materials = Array.from(materialMap).map(([name, volume]) => ({
              name,
              volume,
            }));

            console.log(`Aggregated ${materials.length} unique materials`);
            console.log("Material list:", materials);

            // Return aggregated materials AND the raw elements
            ws.send(
              JSON.stringify({
                type: "project_materials",
                projectId,
                name: projectName,
                metadata: projectMetadata || {
                  filename: "Unbekannte Datei",
                  upload_timestamp: "",
                },
                ifcData: {
                  materials: materials, // Send aggregated materials for Material tab
                  elements: projectElements, // Send raw elements for Bauteile tab
                },
                materialMappings: savedLcaData?.materialMappings || {},
                ebf: savedLcaData?.ebf || null,
                messageId: data.messageId,
              })
            );
          }
          // If no elements found, return empty structure but still conform
          else {
            ws.send(
              JSON.stringify({
                type: "project_materials",
                projectId,
                name: projectName,
                metadata: projectMetadata || {
                  filename: "Unbekannte Datei",
                  upload_timestamp: "",
                },
                ifcData: { materials: [], elements: [] }, // Send empty arrays
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
        console.log("Processing save_project_materials...");
        const { projectId, materialMappings, ebfValue } = data; // Removed ifcData if not directly used
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

        // 1. Fetch QTO Project Metadata (for Kafka)
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
            // Get the original timestamp ONLY from metadata.upload_timestamp
            const originalTimestamp = qtoProject.metadata?.upload_timestamp;

            if (!originalTimestamp) {
              console.error(
                `Original upload_timestamp missing in metadata for project ${projectId}. Cannot create accurate Kafka metadata.`
              );
              // Handle the error appropriately - e.g., return or throw
              // For now, kafkaMetadata will remain null, stopping the process later
            } else {
              kafkaMetadata = {
                project: qtoProject.name || `Project_${projectId}`,
                filename: qtoProject.metadata?.filename || "unknown.ifc",
                // Use ONLY the original timestamp
                timestamp: new Date(originalTimestamp).toISOString(),
                fileId: qtoProject.metadata?.file_id || projectId.toString(),
              };
            }
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
          return; // Exit if metadata is missing
        }

        // 2. Fetch necessary data for LCA Calculation
        const [qtoElements, kbobMaterials] = await Promise.all([
          qtoDb
            .collection<QtoElement>("elements") // Use interface
            .find({ project_id: new ObjectId(projectId), status: "active" })
            .toArray(),
          lcaDb.collection<KbobMaterial>("materialLibrary").find({}).toArray(), // Use interface
        ]);
        console.log(
          `Fetched ${qtoElements.length} active QTO elements and ${kbobMaterials.length} KBOB materials.`
        );

        // 3. Perform LCA Calculation using the new service
        const ebfNumeric = ebfValue ? parseFloat(ebfValue) : null;
        const calculationResult = LcaCalculationService.calculateLcaResults(
          qtoElements,
          materialMappings || {}, // Ensure it's an object
          kbobMaterials,
          ebfNumeric
        );

        console.log(
          `LCA Calculation completed. Total GWP: ${calculationResult.totalImpact.gwp.toFixed(
            2
          )}`
        );

        // 4. Save Summary to DB
        const lcaResultsCollection = lcaDb.collection(
          config.mongodb.collections.lcaResults
        );
        const finalEbf =
          ebfNumeric !== null && !isNaN(ebfNumeric) && ebfNumeric > 0
            ? ebfNumeric
            : null; // Keep EBF in summary

        await lcaResultsCollection.updateOne(
          { projectId },
          {
            $set: {
              projectId,
              // Store calculated totals and other summary info
              totalImpact: calculationResult.totalImpact,
              numberOfInstancesProcessed:
                calculationResult.numberOfInstancesProcessed,
              numberOfInstancesWithErrors:
                calculationResult.numberOfInstancesWithErrors,
              materialMappings: materialMappings || {}, // Save the mappings used
              ebf: finalEbf, // Save the EBF used
              lastUpdated: new Date(),
              // Avoid storing the full 'ifcData' or large instance lists here unless necessary
            },
          },
          { upsert: true }
        );
        console.log(
          `Saved/Updated LCA results summary for project ${projectId}.`
        );

        // 5. Send detailed material instances to Kafka
        if (calculationResult.materialInstances.length > 0 && kafkaMetadata) {
          console.log(
            `Sending ${calculationResult.materialInstances.length} processed material instances to Kafka...`
          );
          // <<< Pass pre-calculated results directly to KafkaService >>>
          await kafkaService.sendLcaBatchToKafka(
            calculationResult.materialInstances, // Array of MaterialInstanceResult
            kafkaMetadata
            // No need to pass totals or ebf anymore
          );
        } else if (!kafkaMetadata) {
          console.error(
            "Cannot send to Kafka: Missing Kafka metadata was already checked, but re-checking."
          );
        } else {
          console.log(
            "No processed material instances with impact found to send to Kafka."
          );
        }

        // 6. Send confirmation back to client
        ws.send(
          JSON.stringify({
            type: "materials_saved",
            projectId,
            messageId: data.messageId,
          })
        );
        console.log(
          `Sent materials_saved confirmation for project ${projectId}.`
        );
      } // End save_project_materials

      // SEND_LCA_DATA handler
      if (data.type === "send_lca_data") {
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
            // Get the original timestamp ONLY from metadata.upload_timestamp
            const originalTimestamp = qtoProject.metadata?.upload_timestamp;

            if (!originalTimestamp) {
              console.error(
                `CRITICAL: Original upload_timestamp missing in metadata for project ${projectId} (send_lca_data). Cannot create accurate Kafka metadata.`
              );
              // Handle the error appropriately - e.g., return or throw
              // For now, kafkaMetadata will remain null, stopping the process later
            } else {
              kafkaMetadata = {
                project: qtoProject.name || `Project_${projectId}`,
                filename: qtoProject.metadata?.filename || "unknown.ifc",
                // Use ONLY the original timestamp
                timestamp: new Date(originalTimestamp).toISOString(),
                fileId: qtoProject.metadata?.file_id || projectId.toString(),
              };
            }
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
          (element: any, index: number) => ({
            id:
              element.qto_element_id ||
              element._id?.toString() ||
              element.id ||
              `unknown_${index}`,
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
              impact: material.impact || undefined,
            })),
            impact: element.impact || { gwp: 0, ubp: 0, penr: 0 },
            sequence: index,
          })
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

        // Use the legacy method for backward compatibility
        const result = await kafkaService.sendLcaBatchToKafkaLegacy(
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
      // Avoid crashing the server on single message failure
      try {
        const data = JSON.parse(message.toString());
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Failed to process request: ${
              error instanceof Error ? error.message : String(error)
            }`,
            messageId: data.messageId || null,
          })
        );
      } catch (parseError) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Failed to process invalid message format",
          })
        );
      }
    } finally {
      if (dbClient) {
        await dbClient.close();
        // console.log("DB connection closed."); // Optional: Verify closure
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

  // --- Connect to Database ONCE on startup ---
  try {
    console.log("Establishing MongoDB connection for the server...");
    const { lcaDb, client } = await connectToDatabases();
    lcaDbInstance = lcaDb; // Store the Db instance
    mongoClientInstance = client; // Store the client instance
    console.log("MongoDB connection established and ready.");
  } catch (dbError) {
    console.error("FATAL: Failed to connect to MongoDB on startup.", dbError);
    // Optionally exit if DB connection is critical for startup
    // process.exit(1);
  }
  // --- End Database Connection ---

  try {
    // Initialize Kafka
    const kafkaInitialized = await kafkaService.initialize();
    if (kafkaInitialized) {
      console.log("Kafka service initialized successfully");
    } else {
      console.error("Failed to initialize Kafka service");
    }
  } catch (error) {
    console.error("Failed to initialize Kafka:", error);
  }
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");

  // Disconnect Kafka
  await kafkaService.disconnect();

  // Close MongoDB connection
  if (mongoClientInstance) {
    console.log("Closing MongoDB connection...");
    await mongoClientInstance.close();
    console.log("MongoDB connection closed.");
  }

  // Close the server
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
