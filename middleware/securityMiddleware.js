const helmet = require("helmet");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");

/**
 * Helmet Security Headers Configuration
 * Hardens HTTP headers while preserving smooth cross-origin API accessibility for frontends
 */
const helmetSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "*"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

/**
 * NoSQL Injection Sanitizer
 * Recursively removes MongoDB operator keys (starting with $) and dot notation (.)
 * from req.body, req.params, and req.query.
 */
const sanitizeNoSQL = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  try {
    if (req.body) sanitizeObject(req.body);
    if (req.params) sanitizeObject(req.params);
    if (req.query) {
      // Handle potential read-only queries in Express 5 safely
      try {
        sanitizeObject(req.query);
      } catch (err) {
        // Express 5 query object getter fallback
      }
    }
  } catch (error) {
    console.warn("⚠️ [Security] Failed to sanitize request payload:", error.message);
  }

  next();
};

/**
 * Global API Rate Limiter
 * Guards the server against high-frequency scraping and DoS bursts
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 600, // Limit each IP to 600 requests per windowMs
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false, // Disable X-RateLimit headers
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 15 minutes.",
  },
  skip: (req) => {
    // Exclude health check and root endpoints from rate limits
    const path = req.path || req.originalUrl || "";
    return path === "/" || path === "/api/health";
  },
});

/**
 * Strict Authentication Rate Limiter
 * Specifically protects sensitive auth routes from brute-force & credential stuffing
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 25, // Limit each IP to 25 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many login/registration attempts from this IP. Please try again after 15 minutes.",
  },
});

module.exports = {
  helmetSecurity,
  sanitizeNoSQL,
  hppSecurity: hpp(),
  apiLimiter,
  authLimiter,
};
