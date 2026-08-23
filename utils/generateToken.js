const jwt = require('jsonwebtoken');

/**
 * Generate a JSON Web Token for authenticated user
 * @param {Object} payload - { id, email, role, name }
 * @returns {String} JWT Token
 */
const generateToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'gotech_hrms_super_secret_jwt_key_2026_secure',
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};

module.exports = generateToken;
