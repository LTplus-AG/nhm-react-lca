import dotenv from "dotenv";

dotenv.config();

// Ensure authSource=admin is used for MongoDB authentication
let MONGODB_URI = process.env.MONGODB_URI as string;
if (MONGODB_URI && !MONGODB_URI.includes("authSource=")) {
  MONGODB_URI += "?authSource=admin";
} else if (MONGODB_URI && MONGODB_URI.includes("authSource=cost")) {
  MONGODB_URI = MONGODB_URI.replace("authSource=cost", "authSource=admin");
}

export const config = {
  websocket: { port: parseInt(process.env.WEBSOCKET_PORT || "8002") },
  mongodb: {
    enabled: true,
    uri:
      MONGODB_URI ||
      "mongodb://admin:secure_password@mongodb:27017/?authSource=admin", // Fallback URI
    database: process.env.MONGODB_DATABASE || "lca",
    collections: {
      lcaResults: "lcaResults",
      materialLibrary: "materialLibrary",
      references: "references",
      materialEmissions: "materialEmissions",
      elementEmissions: "elementEmissions",
    },
    qtoDatabase: process.env.MONGODB_QTO_DATABASE || "qto",
    auth: {
      username: process.env.MONGODB_USERNAME || "admin",
      password: process.env.MONGODB_PASSWORD || "secure_password",
    },
  },
  kafka: {
    // Add Kafka config if needed by other parts, keep minimal for now
    broker: process.env.KAFKA_BROKER || "broker:29092",
    lcaTopic: process.env.KAFKA_TOPIC_LCA || "lca-data",
    // Add other topics if needed
  },
};

// Validate required environment variables for MongoDB URI construction
if (!config.mongodb.uri) {
  console.error(`ERROR: Missing required environment variable: MONGODB_URI`);
  throw new Error(`Missing required environment variable: MONGODB_URI`);
}

console.log(
  `Configured MongoDB URI: ${config.mongodb.uri.replace(/:[^:]*@/, ":****@")}`
);
console.log(`Configured LCA DB: ${config.mongodb.database}`);
console.log(`Configured QTO DB: ${config.mongodb.qtoDatabase}`);
