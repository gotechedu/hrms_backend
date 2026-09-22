/**
 * Production Input Validation Middleware
 * Validates email, mobile/phone numbers, personal names, URLs, and text fields
 * against malicious scripts and malformed inputs.
 */

// RFC 5322 compliant email regex pattern (safe from ReDoS)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Standard mobile/phone regex pattern: 10-15 digits, allowing optional leading '+'
// Rejects letters, symbols (except standard separator spaces/dashes), and script attempts
const PHONE_CLEAN_REGEX = /[\s\-\(\)\.]/g;
const VALID_PHONE_DIGITS_REGEX = /^\+?[1-9]\d{9,14}$/;

// Safe human name pattern (alphabetic, unicode letters, spaces, hyphens, dots, apostrophes)
// Disallows HTML characters < > { } = ; $
const SAFE_NAME_REGEX = /^[\p{L}\s.'-]{2,100}$/u;

// Safe web URL pattern (http/https only)
const SAFE_URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{2,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;

/**
 * Validates an email string
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  if (clean.length < 5 || clean.length > 100) return false;
  return EMAIL_REGEX.test(clean);
};

/**
 * Validates a mobile/phone number
 */
const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const stripped = phone.replace(PHONE_CLEAN_REGEX, '');
  return VALID_PHONE_DIGITS_REGEX.test(stripped);
};

/**
 * Validates a human name
 */
const isValidName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim();
  return clean.length >= 2 && clean.length <= 100 && SAFE_NAME_REGEX.test(clean);
};

/**
 * Validates a safe web URL
 */
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  return clean.length <= 500 && SAFE_URL_REGEX.test(clean);
};

/**
 * Checks if a string contains un-sanitized script vectors
 */
const containsScriptVectors = (val) => {
  if (typeof val !== 'string') return false;
  return (
    /<script\b/i.test(val) ||
    /javascript\s*:/i.test(val) ||
    /\bon\w+\s*=/i.test(val) ||
    /<\/?(?:iframe|object|embed)/i.test(val)
  );
};

/**
 * Middleware: Validate Contact Inquiry Input
 */
const validateContactInquiryInput = (req, res, next) => {
  const { fullName, email, phone, message } = req.body || {};

  if (!fullName || !isValidName(fullName)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid full name (2–100 alphabetic characters).',
    });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address (e.g. name@example.com).',
    });
  }

  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid contact mobile number (10–15 digits, digits only).',
    });
  }

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a message describing your inquiry (at least 5 characters).',
    });
  }

  if (message.length > 3000) {
    return res.status(400).json({
      success: false,
      message: 'Message is too long (maximum 3,000 characters allowed).',
    });
  }

  if (containsScriptVectors(message) || containsScriptVectors(fullName)) {
    return res.status(400).json({
      success: false,
      message: 'Input contains prohibited script or executable HTML tags.',
    });
  }

  next();
};

/**
 * Middleware: Validate Course Application Input
 */
const validateCourseApplicationInput = (req, res, next) => {
  const { studentName, email, phone, courseTitle, learningGoal, password } = req.body || {};

  if (!studentName || !isValidName(studentName)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid student name (2–100 alphabetic characters).',
    });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
  }

  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid mobile number (10–15 digits).',
    });
  }

  if (!courseTitle || typeof courseTitle !== 'string' || courseTitle.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Valid course title is required.',
    });
  }

  if (learningGoal && typeof learningGoal === 'string' && learningGoal.length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Learning goal/note cannot exceed 2,000 characters.',
    });
  }

  if (password && typeof password === 'string' && password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Account password must be at least 6 characters long.',
    });
  }

  if (containsScriptVectors(studentName) || containsScriptVectors(courseTitle)) {
    return res.status(400).json({
      success: false,
      message: 'Prohibited scripting characters detected in application payload.',
    });
  }

  next();
};

/**
 * Middleware: Validate Job Application Input
 */
const validateJobApplicationInput = (req, res, next) => {
  const { name, email, phone, jobTitle, portfolioUrl, coverLetter } = req.body || {};

  if (!name || !isValidName(name)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid applicant name (2–100 alphabetic characters).',
    });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
  }

  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid mobile/phone number (10–15 digits).',
    });
  }

  if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Job title is required.',
    });
  }

  if (portfolioUrl && portfolioUrl.trim() !== '') {
    if (!isValidUrl(portfolioUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Portfolio URL must be a valid http:// or https:// address.',
      });
    }
  }

  if (coverLetter && typeof coverLetter === 'string' && coverLetter.length > 3000) {
    return res.status(400).json({
      success: false,
      message: 'Cover letter cannot exceed 3,000 characters.',
    });
  }

  if (containsScriptVectors(name) || containsScriptVectors(jobTitle) || containsScriptVectors(coverLetter || '')) {
    return res.status(400).json({
      success: false,
      message: 'Prohibited scripting characters detected in job application.',
    });
  }

  next();
};

/**
 * Middleware: Validate Payment Order Request
 */
const validatePaymentOrderInput = (req, res, next) => {
  const { amount, currency } = req.body || {};
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'A valid positive payment amount is required.',
    });
  }

  if (currency && typeof currency === 'string' && !['INR', 'USD', 'EUR', 'GBP'].includes(currency.toUpperCase())) {
    return res.status(400).json({
      success: false,
      message: 'Unsupported payment currency.',
    });
  }

  next();
};

/**
 * Middleware: Validate Payment Verification Request
 */
const validatePaymentVerifyInput = (req, res, next) => {
  const { studentName, email, phone, courseTitle } = req.body || {};

  if (!studentName || !isValidName(studentName)) {
    return res.status(400).json({
      success: false,
      message: 'Valid student name is required for payment verification.',
    });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Valid email address is required for invoice delivery.',
    });
  }

  if (phone && !isValidPhone(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Valid phone number is required.',
    });
  }

  if (!courseTitle || typeof courseTitle !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Course title is required.',
    });
  }

  next();
};

/**
 * Middleware: Validate Coupon Code Input
 */
const validateCouponInput = (req, res, next) => {
  const { code } = req.body || {};
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Coupon code is required.',
    });
  }

  const clean = code.trim();
  if (clean.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid coupon code format.',
    });
  }

  next();
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidUrl,
  containsScriptVectors,
  validateContactInquiryInput,
  validateCourseApplicationInput,
  validateJobApplicationInput,
  validatePaymentOrderInput,
  validatePaymentVerifyInput,
  validateCouponInput,
};
