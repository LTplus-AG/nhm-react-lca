import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Configuration
const config = {
  websocket: {
    port: parseInt(process.env.WEBSOCKET_PORT || "8002"),
  },
  mongodb: {
    enabled: true,
    uri:
      process.env.MONGODB_URI ||
      "mongodb://admin:secure_password@mongodb:27017/?authSource=admin",
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
      username: process.env.MONGODB_USERNAME || "admin",
      password: process.env.MONGODB_PASSWORD || "secure_password",
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
  try {
    console.log("Connecting to MongoDB...");
    const client = new MongoClient(config.mongodb.uri, {
      auth: {
        username: config.mongodb.auth.username,
        password: config.mongodb.auth.password,
      },
    });

    await client.connect();
    console.log("Connected to MongoDB successfully");

    const db = client.db(config.mongodb.database);

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

      // Handle getting projects
      if (data.type === "get_projects") {
        try {
          // Connect to MongoDB and fetch projects from QTO database
          const client = new MongoClient(config.mongodb.uri, {
            auth: {
              username: config.mongodb.auth.username,
              password: config.mongodb.auth.password,
            },
          });

          await client.connect();
          const qtoDb = client.db(config.mongodb.qtoDatabase);
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
          const collection = db.collection(
            config.mongodb.collections.lcaResults
          );

          // First, get the project name from QTO database
          let projectName = "New Project";
          let projectElements: QtoElement[] = [];

          try {
            const client = new MongoClient(config.mongodb.uri, {
              auth: {
                username: config.mongodb.auth.username,
                password: config.mongodb.auth.password,
              },
            });

            await client.connect();
            const qtoDb = client.db(config.mongodb.qtoDatabase);

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

          // Try to find existing project data in LCA database
          const projectData = await collection.findOne({ projectId });

          // If we have data in LCA database, use that
          if (projectData) {
            ws.send(
              JSON.stringify({
                type: "project_materials",
                projectId,
                ...projectData,
                name: projectName,
                messageId: data.messageId,
              })
            );
          }
          // If no data in LCA database but we have elements, aggregate materials
          else if (projectElements && projectElements.length > 0) {
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

            // Return aggregated materials
            ws.send(
              JSON.stringify({
                type: "project_materials",
                projectId,
                name: projectName,
                ifcData: { materials },
                materialMappings: {},
                messageId: data.messageId,
              })
            );
          }
          // If no data anywhere, return empty structure
          else {
            ws.send(
              JSON.stringify({
                type: "project_materials",
                projectId,
                name: projectName,
                ifcData: { materials: [] },
                materialMappings: {},
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
          const { projectId, ifcData, materialMappings } = data;
          const db = await connectToMongo();
          const collection = db.collection(
            config.mongodb.collections.lcaResults
          );

          // Update or insert materials
          await collection.updateOne(
            { projectId },
            {
              $set: {
                projectId,
                ifcData,
                materialMappings,
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
            const client = new MongoClient(config.mongodb.uri, {
              auth: {
                username: config.mongodb.auth.username,
                password: config.mongodb.auth.password,
              },
            });

            await client.connect();
            const qtoDb = client.db(config.mongodb.qtoDatabase);

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
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
