/**
 * Anti-XSS and Script Injection Sanitizer Middleware
 * Defends against Cross-Site Scripting (XSS), inline event attacks,
 * malicious URIs, and Prototype Pollution across req.body, req.query, and req.params.
 */

// Regex patterns to detect and strip dangerous script tags and executable vectors
const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const DANGEROUS_TAGS_REGEX = /<\/?(?:script|iframe|object|embed|applet|style|link|meta|base|form|svg(?=[\s>])|math(?=[\s>]))[^>]*>/gi;
const EVENT_HANDLER_REGEX = /\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
const JAVASCRIPT_PROTOCOL_REGEX = /(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi;
const NULL_BYTE_REGEX = /\0/g;

/**
 * Sanitizes a single string value to eliminate scripting attacks
 * @param {string} str
 * @returns {string}
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  return str
    .replace(NULL_BYTE_REGEX, '')
    .replace(SCRIPT_TAG_REGEX, '')
    .replace(DANGEROUS_TAGS_REGEX, '')
    .replace(EVENT_HANDLER_REGEX, '')
    .replace(JAVASCRIPT_PROTOCOL_REGEX, '')
    .trim();
};

/**
 * Recursively sanitizes any JavaScript object or array
 * Also guards against Prototype Pollution by blocking dangerous keys
 * @param {any} target
 * @returns {any}
 */
const deepSanitize = (target) => {
  if (!target || typeof target !== 'object') {
    return typeof target === 'string' ? sanitizeString(target) : target;
  }

  if (Array.isArray(target)) {
    return target.map((item) => deepSanitize(item));
  }

  const cleanObj = {};
  for (const [key, value] of Object.entries(target)) {
    // Prototype Pollution Guard
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    const cleanKey = sanitizeString(key);
    cleanObj[cleanKey] = deepSanitize(value);
  }

  return cleanObj;
};

/**
 * Express middleware to sanitize incoming request payloads
 */
const xssSanitizer = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = deepSanitize(req.body);
    }

    if (req.params && typeof req.params === 'object') {
      req.params = deepSanitize(req.params);
    }

    // Express 5 query object can be read-only in some configurations
    if (req.query && typeof req.query === 'object') {
      try {
        const cleanedQuery = deepSanitize(req.query);
        for (const key of Object.keys(req.query)) {
          if (!cleanedQuery[key]) delete req.query[key];
          else req.query[key] = cleanedQuery[key];
        }
      } catch (qErr) {
        // Query getter fallback
      }
    }
  } catch (error) {
    console.warn('⚠️ [xssSanitizer] Request payload sanitization error:', error.message);
  }

  next();
};

module.exports = {
  xssSanitizer,
  sanitizeString,
  deepSanitize,
};
