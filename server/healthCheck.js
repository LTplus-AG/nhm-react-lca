const http = require("http");

function checkServer() {
  http
    .get("http://localhost:5000/api/health", (resp) => {
      let data = "";
      resp.on("data", (chunk) => {
        data += chunk;
      });
      resp.on("end", () => {
        console.log("Server health check response:", data);
      });
    })
    .on("error", (err) => {
      console.error("Server health check failed:", err.message);
    });
}

// Run the check
checkServer();
