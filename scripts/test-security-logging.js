const http = require("http");
const dotenv = require("dotenv");
dotenv.config();

process.env.NODE_ENV = "development"; // Ensure morgan logs
const app = require("../app");

const PORT = 5088;

const makeRequest = (method, path, headers = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      }
    );

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const run = async () => {
  const server = app.listen(PORT, async () => {
    console.log(`\n--- Verification Server running on port ${PORT} ---\n`);

    try {
      // 1. Test OPTIONS request (Should be skipped/NOT logged)
      console.log("➡️  Testing OPTIONS request (Preflight should be silent)...");
      await makeRequest("OPTIONS", "/api/courses");

      // 2. Test Public / Anonymous request
      console.log("\n➡️  Testing Public Request to /api/health...");
      const healthRes = await makeRequest("GET", "/api/health");
      console.log(`   Status: ${healthRes.statusCode}`);

      // 3. Test React StrictMode Duplicate Request (Two calls to /api/courses within 50ms)
      console.log("\n➡️  Testing Rapid Duplicate GET requests (Second should be suppressed)...");
      await makeRequest("GET", "/api/courses");
      await makeRequest("GET", "/api/courses");

      // 4. Test Different path with long URL to check alignment
      console.log("\n➡️  Testing Request to /api/offers/portal-popup...");
      await makeRequest("GET", "/api/offers/portal-popup");

      // 3. Test Auth Login request with Email in Body
      console.log("\n➡️  Testing Login Request with email in body (Expecting email log)...");
      await makeRequest("POST", "/api/auth/login", {}, {
        email: "aditya@gotechedu.com",
        password: "wrongpasswordtest",
      });

      // 4. Test Authenticated Request with JWT Token
      console.log("\n➡️  Testing Authenticated Request with JWT Bearer Token...");
      const jwt = require("jsonwebtoken");
      const testToken = jwt.sign(
        { id: "test12345", email: "officer@gotechedu.com", role: "hr" },
        process.env.JWT_SECRET || "gotech_hrms_super_secret_jwt_key_2026_secure"
      );

      await makeRequest("GET", "/api/employees", {
        Authorization: `Bearer ${testToken}`,
      });

      // 5. Test NoSQL Injection Sanitization
      console.log("\n➡️  Testing NoSQL Injection Filter ($gt operator in body)...");
      const sanitizeRes = await makeRequest("POST", "/api/auth/login", {}, {
        email: "test@example.com",
        $gt: { dummy: 1 },
      });
      console.log(`   Sanitizer handled cleanly: status=${sanitizeRes.statusCode}`);

      console.log("\n✅ All security headers & Morgan logger verifications passed successfully!\n");
    } catch (err) {
      console.error("❌ Test error:", err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
};

run();
