const morgan = require("morgan");
const jwt = require("jsonwebtoken");

/**
 * Determine if ANSI colors are properly supported by terminal
 */
const supportsColor = Boolean(
  process.stdout.isTTY &&
    !process.env.NO_COLOR &&
    process.env.TERM !== "dumb"
);

/**
 * Safe ANSI Color Formatter (applies color without breaking column padding)
 */
const clr = (str, code) => (supportsColor ? `\x1b[${code}m${str}\x1b[0m` : str);

const colors = {
  dim: (s) => clr(s, "90"),
  bold: (s) => clr(s, "1"),
  green: (s) => clr(s, "32"),
  brightGreen: (s) => clr(s, "92"),
  cyan: (s) => clr(s, "36"),
  brightCyan: (s) => clr(s, "96"),
  yellow: (s) => clr(s, "33"),
  brightYellow: (s) => clr(s, "93"),
  blue: (s) => clr(s, "94"),
  magenta: (s) => clr(s, "35"),
  red: (s) => clr(s, "91"),
  white: (s) => clr(s, "37"),
};

/**
 * Extract real client IP, considering proxies & IPv6 local mapping
 */
const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  let ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket?.remoteAddress || req.ip || "127.0.0.1";

  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    ip = "127.0.0.1";
  } else if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }
  return ip;
};

/**
 * Extract authenticated user email or identify as Anonymous
 */
const getUserIdentity = (req) => {
  const ip = getClientIp(req);
  let email = null;
  let role = null;

  // 1. Check req.user attached by protect / optionalProtect
  if (req.user && req.user.email) {
    email = req.user.email;
    role = req.user.role || null;
  }

  // 2. If token is in Authorization header, decode payload
  if (
    !email &&
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.decode(token);
      if (decoded && decoded.email) {
        email = decoded.email;
        role = decoded.role || null;
      }
    } catch (e) {
      // Ignore decode error
    }
  }

  // 3. If login/registration attempt, extract email from body
  if (
    !email &&
    req.body &&
    typeof req.body.email === "string" &&
    req.body.email.trim()
  ) {
    email = req.body.email.trim();
  }

  if (email) {
    const roleTag = role ? ` (${role})` : "";
    const rawText = `👤 ${email}${roleTag} [${ip}]`;
    const padded = rawText.padEnd(36);
    return colors.brightCyan(padded);
  }

  const rawText = `🌐 Anonymous [${ip}]`;
  const padded = rawText.padEnd(36);
  return colors.yellow(padded);
};

/**
 * Debounce duplicate GET requests within 350ms
 * (Eliminates React 18 StrictMode double-fetch log clutter)
 */
const recentRequests = new Map();
const isDuplicateStrictModeRequest = (req) => {
  if (req.method !== "GET") return false; // Never skip mutation requests (POST/PUT/DELETE)

  const ip = getClientIp(req);
  const key = `${ip}:${req.originalUrl || req.url}`;
  const now = Date.now();
  const lastTime = recentRequests.get(key);

  if (lastTime && now - lastTime < 350) {
    return true; // Duplicate request within 350ms window
  }

  recentRequests.set(key, now);

  // Periodic cleanup
  if (recentRequests.size > 200) {
    for (const [k, timestamp] of recentRequests.entries()) {
      if (now - timestamp > 2000) recentRequests.delete(k);
    }
  }

  return false;
};

/**
 * Register Organized Morgan Custom Tokens
 */

// Time token: [HH:mm:ss]
morgan.token("org-time", () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timeStr = `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
  return colors.dim(timeStr);
});

// Method token: Pad first, then colorize
morgan.token("org-method", (req) => {
  const method = req.method.toUpperCase();
  const padded = method.padEnd(6);

  switch (method) {
    case "GET":
      return colors.brightGreen(padded);
    case "POST":
      return colors.blue(padded);
    case "PUT":
      return colors.brightYellow(padded);
    case "PATCH":
      return colors.magenta(padded);
    case "DELETE":
      return colors.red(padded);
    default:
      return colors.white(padded);
  }
});

// Status token: Pad first, then colorize
morgan.token("org-status", (req, res) => {
  const status = res.statusCode;
  const statusText = res.statusMessage || "";
  const raw = `${status} ${statusText}`.padEnd(18);

  if (status >= 500) return colors.red(raw);
  if (status >= 400) return colors.yellow(raw);
  if (status >= 300) return colors.cyan(raw);
  return colors.green(raw);
});

// Response time token: Pad first, then colorize
morgan.token("org-time-ms", (req, res) => {
  if (!req._startAt || !res._startAt) return "   0ms".padEnd(8);
  const ms =
    (res._startAt[0] - req._startAt[0]) * 1e3 +
    (res._startAt[1] - req._startAt[1]) * 1e-6;

  const formatted = `${Math.round(ms)}ms`.padStart(6).padEnd(8);

  if (ms > 500) return colors.red(formatted);
  if (ms > 150) return colors.yellow(formatted);
  return colors.green(formatted);
});

// Identity token
morgan.token("org-identity", (req) => {
  return getUserIdentity(req);
});

// URL path token
morgan.token("org-url", (req) => {
  const url = req.originalUrl || req.url;
  return colors.white(`--> ${url}`);
});

/**
 * Formatted, High-Precision Column-Aligned Morgan Middleware
 *
 * Example Output:
 * [13:11:57]  GET   200 OK            85ms   | 🌐 Anonymous [127.0.0.1]          --> /api/courses
 * [13:11:57]  GET   304 Not Modified  73ms   | 🌐 Anonymous [127.0.0.1]          --> /api/offers/portal-popup
 * [13:12:05]  POST  200 OK            45ms   | 👤 admin@gotechedu.com [127.0.0.1] --> /api/auth/login
 */
const requestLogger = morgan(
  ":org-time  :org-method :org-status :org-time-ms | :org-identity :org-url",
  {
    skip: (req, res) => {
      // 1. Skip CORS preflight OPTIONS requests (eliminates browser preflight spam)
      if (req.method === "OPTIONS") {
        return true;
      }

      // 2. Skip automated tests
      if (process.env.NODE_ENV === "test" && !process.env.DEBUG) {
        return true;
      }

      // 3. Skip static assets / favicon noise
      const url = req.originalUrl || req.url;
      if (url.includes("favicon.ico") || url.includes("/robots.txt")) {
        return true;
      }

      // 4. Skip rapid React StrictMode double-render duplicate calls
      if (isDuplicateStrictModeRequest(req)) {
        return true;
      }

      return false;
    },
  }
);

module.exports = {
  requestLogger,
  getClientIp,
  getUserIdentity,
};
