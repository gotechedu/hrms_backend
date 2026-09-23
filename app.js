const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

const {
  helmetSecurity,
  sanitizeNoSQL,
  hppSecurity,
  apiLimiter,
  authLimiter,
  formSubmitLimiter,
} = require("./middleware/securityMiddleware");
const { xssSanitizer } = require("./middleware/xssSanitizer");
const { requestLogger } = require("./middleware/requestLogger");

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();

// Trust reverse proxies (Vercel, Nginx, Cloudflare) for accurate client IP detection
app.set("trust proxy", 1);
app.disable("x-powered-by");

// 1. CORS Configuration & Preflight Handling (Must be mounted before Helmet & Loggers)
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:5172",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5172",
  "https://gotechedu.com",
  "https://www.gotechedu.com",
  "https://portal.gotechedu.com",
  "https://gotechedu.vercel.app",
  "https://hrmsgotechedu.vercel.app",
];

const corsOptions = {
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
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
  ],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// 2. Security Headers (Helmet)
app.use(helmetSecurity);

// 3. HTTP Request Logger (Morgan with User Email / IP & Timing)
app.use(requestLogger);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// 3. NoSQL Injection Sanitization, Anti-XSS & Parameter Pollution Prevention
app.use(sanitizeNoSQL);
app.use(xssSanitizer);
app.use(hppSecurity);

// 4. Rate Limiting Protection
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/contacts", formSubmitLimiter);
app.use("/api/course-applications", formSubmitLimiter);
app.use("/api/job-applications", formSubmitLimiter);

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
      contacts: "/api/contacts",
      discussions: "/api/discussions",
      recycleBin: "/api/recycle-bin",
      policies: "/api/policies",
      grievances: "/api/grievances",
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

const http = require("http");
const { initSocket } = require("./socket");

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
app.use("/api/contacts", require("./routes/contactRoute"));
app.use("/api/discussions", require("./routes/discussionRoute"));
app.use("/api/chat", require("./routes/chatRoute"));
app.use("/api/recycle-bin", require("./routes/recycleBinRoute"));
app.use("/api/roles", require("./routes/roleRoute"));
app.use("/api/permissions", require("./routes/permissionRoute"));
app.use("/api/policies", require("./routes/policyRoute"));
app.use("/api/grievances", require("./routes/grievanceRoute"));
app.use("/api", require("./routes/rolePermissionRoute"));

// LMS Enterprise Subsystem Routes
app.use("/api/curriculum", require("./routes/curriculumRoute"));
app.use("/api/batches", require("./routes/batchRoute"));
app.use("/api/trainer-assignments", require("./routes/trainerAssignmentRoute"));
app.use("/api/enrollments", require("./routes/enrollmentRoute"));
app.use("/api/classes", require("./routes/classRoute"));
app.use(
  "/api/learning-attendance",
  require("./routes/learningAttendanceRoute"),
);
app.use("/api/assignments", require("./routes/assignmentRoute"));
app.use("/api/assessments", require("./routes/assessmentRoute"));
app.use("/api/certificates", require("./routes/certificateRoute"));
app.use("/api/learning-analytics", require("./routes/learningAnalyticsRoute"));

// Standalone Direct Payment Endpoints
const {
  createPaymentOrder,
  verifyPaymentSignature,
} = require("./controllers/paymentController");
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
  const isDev = process.env.NODE_ENV === "development";

  // Prevent leaking internal database errors or stack traces in production
  let clientMessage = err.message || "Internal Server Error";
  if (statusCode === 500 && !isDev) {
    clientMessage = "An unexpected error occurred. Please try again later.";
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    error: isDev ? err.stack : undefined,
  });
});

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

if (require.main === module && process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🛡️  GoTechEdu HRMS Backend Server is active!`);
    console.log(`📍 Port: http://localhost:${PORT}`);
    console.log(`🔑 Auth Endpoints: http://localhost:${PORT}/api/auth`);
    console.log(
      `👥 Employee Endpoints: http://localhost:${PORT}/api/employees`,
    );
    console.log(
      `💬 Real-Time Chat & Socket.IO: http://localhost:${PORT}/api/chat`,
    );
    console.log(`=================================================\n`);
  });
}

app.server = server;
module.exports = app;
