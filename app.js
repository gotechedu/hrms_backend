const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();

// Allowed CORS Origins Whitelist
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:5172",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5172",
  "https://gotechedu.vercel.app",
  "https://hrmsgotechedu.vercel.app",
  "http://localhost:5173"
];

// Core Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Normalize origin removing trailing slash
      const cleanOrigin = origin.replace(/\/+$/, "");

      // Check if origin matches whitelist or any .vercel.app domain
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith(".vercel.app") ||
        cleanOrigin.includes("localhost") ||
        cleanOrigin.includes("127.0.0.1")
      ) {
        return callback(null, true);
      }

      return callback(null, true); // Fallback allow for dev/preview
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health Check & Root API Information
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 GoTechEdu HRMS API Backend is running smoothly",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    availableEndpoints: {
      auth: "/api/auth",
      employees: "/api/employees",
      roles: "/api/roles",
      permissions: "/api/permissions",
      courses: "/api/courses",
      jobs: "/api/jobs",
      blogs: "/api/blogs",
      payroll: "/api/payroll",
      holidays: "/api/holidays",
      projects: "/api/projects",
      tasks: "/api/tasks",
      settings: "/api/settings",
      recycleBin: "/api/recycle-bin",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", require("./routes/authRoute"));
app.use("/api/employees", require("./routes/employeeRoute"));
app.use("/api/courses", require("./routes/courseRoute"));
app.use("/api/course-applications", require("./routes/courseApplicationRoute"));
app.use("/api/payments", require("./routes/paymentRoute"));
app.use("/api/offers", require("./routes/offerRoute"));
app.use("/api/jobs", require("./routes/jobRoute"));
app.use("/api/job-applications", require("./routes/jobApplicationRoute"));
app.use("/api/blogs", require("./routes/blogRoute"));
app.use("/api/payroll", require("./routes/payrollRoute"));
app.use("/api/attendance", require("./routes/attendanceRoute"));
app.use("/api/timesheets", require("./routes/timesheetRoute"));
app.use("/api/holidays", require("./routes/holidayRoute"));
app.use("/api/projects", require("./routes/projectRoute"));
app.use("/api/tasks", require("./routes/taskRoute"));
app.use("/api/settings", require("./routes/settingsRoute"));
app.use("/api/recycle-bin", require("./routes/recycleBinRoute"));
app.use("/api/roles", require("./routes/roleRoute"));
app.use("/api/permissions", require("./routes/permissionRoute"));
app.use("/api", require("./routes/rolePermissionRoute"));

// Standalone Direct Payment Endpoints
const { createPaymentOrder, verifyPaymentSignature } = require("./controllers/paymentController");
app.post("/api/payments/create-order", createPaymentOrder);
app.post("/api/payments/verify-payment", verifyPaymentSignature);
app.post("/api/course-applications/create-order", createPaymentOrder);
app.post("/api/course-applications/verify-payment", verifyPaymentSignature);

// 404 Not Found Middleware
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot find endpoint '${req.originalUrl}' on this server`,
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("[Global Error]", err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🛡️  GoTechEdu HRMS Backend Server is active!`);
    console.log(`📍 Port: http://localhost:${PORT}`);
    console.log(`🔑 Auth Endpoints: http://localhost:${PORT}/api/auth`);
    console.log(
      `👥 Employee Endpoints: http://localhost:${PORT}/api/employees`,
    );
    console.log(`=================================================\n`);
  });
}

module.exports = app;
