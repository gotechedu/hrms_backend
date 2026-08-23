const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();

// Core Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev/API access, can be restricted in prod
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check & Root API Information
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 GoTechEdu HRMS API Backend is running smoothly',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    availableEndpoints: {
      auth: '/api/auth',
      employees: '/api/employees',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoute'));
app.use('/api/employees', require('./routes/employeeRoute'));
app.use('/api/courses', require('./routes/courseRoute'));
app.use('/api/course-applications', require('./routes/courseApplicationRoute'));
app.use('/api/jobs', require('./routes/jobRoute'));
app.use('/api/job-applications', require('./routes/jobApplicationRoute'));
app.use('/api/blogs', require('./routes/blogRoute'));

// 404 Not Found Middleware
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot find endpoint '${req.originalUrl}' on this server`,
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🛡️  GoTechEdu HRMS Backend Server is active!`);
    console.log(`📍 Port: http://localhost:${PORT}`);
    console.log(`🔑 Auth Endpoints: http://localhost:${PORT}/api/auth`);
    console.log(`👥 Employee Endpoints: http://localhost:${PORT}/api/employees`);
    console.log(`=================================================\n`);
  });
}

module.exports = app;
