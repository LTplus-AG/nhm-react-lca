// Import necessary packages
const express = require("express");
const path = require("path");
const cors = require("cors");
const duckdb = require("duckdb");

// Create Express app and set the port
const app = express();
const PORT = 3000;
const db = new duckdb.Database("kbob_materials.db");

// Enable CORS for all routes
app.use(
  cors({
    origin: "http://localhost:5173", // Your Vite dev server
    methods: ["GET"],
    credentials: true,
  })
);

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

/**
 * GET /backend/kbob
 * This route proxies requests to the KBOB API endpoint.
 * It takes any query parameters (e.g. ?pageSize=all) and appends them to the target URL.
 */
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!", details: err.message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("CORS enabled for http://localhost:5173");
});

// Handle process termination
process.on("SIGINT", () => {
  db.close();
  process.exit();
});
