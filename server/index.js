// Import and configure dotenv at the top
require('dotenv').config();

// Import necessary packages
const express = require("express");
const path = require("path");
const cors = require("cors");
const duckdb = require("duckdb");
const fs = require("fs");
const axios = require("axios");

// Create Express app and set the port
const app = express();
const PORT = process.env.PORT || 3000;

// Create database connection - simplified to match working version
const db = new duckdb.Database("kbob_materials.db");

// Configure allowed origins based on environment variables
const allowedOrigin =
  process.env.ALLOWED_ORIGIN ||
  (process.env.NODE_ENV === "production"
    ? "https://host-server.fastbim5.eu"
    : "http://localhost:5173");

// Log the configuration
console.log("Server configuration:", {
  nodeEnv: process.env.NODE_ENV,
  allowedOrigin,
  port: PORT
});

// Enable CORS with configured origin and credentials
app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// Add CORS pre-flight handling
app.options('*', cors({
  origin: allowedOrigin,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Enable JSON parsing for POST requests
app.use(express.json());

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Python backend URL
const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:5000";

// Update the IFC results endpoint
app.get("/api/ifc-results/:projectId/:extra?", async (req, res) => {
  const { projectId, extra } = req.params;
  console.log(`Received request for IFC results - Project ID: ${projectId}`);

  try {
    // First try to get data from Python backend
    const pythonBackendUrl = `${PYTHON_BACKEND_URL}/api/ifc-results/${projectId}`;
    console.log(`Forwarding request to Python backend: ${pythonBackendUrl}`);

    const response = await axios.get(pythonBackendUrl, {
      timeout: 10000,
      headers: {
        Accept: "application/json",
      },
    });

    if (response.data) {
      console.log("Received data from Python backend");
      return res.json(response.data);
    }

    // Fallback to empty response if no data
    console.log("No data received from Python backend, sending empty response");
    return res.json({
      ifcData: { materials: [] },
      materialMappings: {},
    });
  } catch (error) {
    console.error("Error fetching IFC results:", error.message);
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        error: "Python backend service unavailable",
        message: "Could not connect to Python backend service",
      });
    }
    return res.json({
      ifcData: { materials: [] },
      materialMappings: {},
    });
  }
});

// Update material mappings endpoint
app.post("/api/update-material-mappings", async (req, res) => {
  try {
    console.log("Received update-material-mappings payload:", req.body);

    const response = await axios.post(
      `${PYTHON_BACKEND_URL}/api/update-material-mappings`,
      req.body,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error forwarding material mappings update:", error);
    res.status(error.response?.status || 500).json({
      error: "Failed to update material mappings",
      details: error.message,
    });
  }
});

// GET /backend/kbob endpoint - reverted to working version
app.get("/backend/kbob", (req, res) => {
  try {
    db.all(`SELECT * FROM materials`, (err, materials) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(500)
          .json({ error: "Database error", details: err.message });
      }

      if (!materials || !Array.isArray(materials)) {
        console.error("Invalid database response");
        return res.status(500).json({ error: "Invalid database response" });
      }

      console.log(`Sending ${materials.length} materials to client`);
      res.json({ materials });
    });
  } catch (error) {
    console.error("Error fetching KBOB materials:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Serve static files from the dist folder for all requests that are not targeting the backend API
app.use((req, res, next) => {
  if (req.path.startsWith("/backend/")) {
    return next();
  }
  return express.static(path.join(__dirname, "../dist"))(req, res, next);
});

// For any other non-backend request, serve index.html for SPA routing
app.get("*", (req, res) => {
  if (!req.path.startsWith("/backend/")) {
    return res.sendFile(path.join(__dirname, "../dist/index.html"));
  }
  res.status(404).send("Not found");
});

// Add health check endpoint that also checks Python backend
app.get("/api/health", async (req, res) => {
  try {
    // Check Python backend health
    const pythonHealth = await axios.get(`${PYTHON_BACKEND_URL}/health`, {
      timeout: 5000,
    });

    res.json({
      status: "ok",
      pythonBackend: pythonHealth.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      pythonBackend: {
        status: "unavailable",
        error: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start the server
const server = app
  .listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS enabled for ${allowedOrigin}`);
  })
  .on("error", (err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

// Handle process termination
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  server.close(() => {
    console.log("Server stopped.");
    if (db) {
      db.close();
    }
    process.exit();
  });
});
