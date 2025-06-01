// Simple script to check if the FastAPI backend is running
const http = require("http");

const options = {
  hostname: "localhost",
  port: 8000,
  path: "/",
  method: "GET",
  timeout: 5000, // Add timeout for faster feedback if server is not responding
};

console.log(
  "Checking if FastAPI backend is running at http://localhost:8000..."
);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Response:", data);
    console.log("\nAPI is running correctly!");

    // Additional routes to check
    console.log("\nChecking API endpoints structure:");
    checkEndpoint("/api/video/info");
  });
});

req.on("error", (e) => {
  console.error("\nAPI connection error:");
  console.error(e.message);
  console.error("\nPlease make sure the FastAPI server is running:");
  console.error("1. Open a new terminal");
  console.error("2. Navigate to the api directory: cd api");
  console.error("3. Run: python main.py");
});

req.on("timeout", () => {
  console.error("\nAPI connection timed out!");
  req.destroy();
});

req.end();

function checkEndpoint(path) {
  console.log(`Checking if endpoint ${path} exists...`);

  const endpointOptions = {
    hostname: "localhost",
    port: 8000,
    path: path,
    method: "GET",
    timeout: 3000,
  };

  const endpointReq = http.request(endpointOptions, (res) => {
    console.log(`Endpoint ${path} status: ${res.statusCode}`);
  });

  endpointReq.on("error", (e) => {
    console.error(`Error checking endpoint ${path}: ${e.message}`);
  });

  endpointReq.end();
}
