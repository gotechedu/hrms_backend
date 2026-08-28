const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

/**
 * Protect routes - Verify JWT token and attach user to request
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. No authentication token provided.',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'gotech_hrms_super_secret_jwt_key_2026_secure'
    );

    const user = await User.findById(decoded.id).populate('employeeProfile');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Your account is currently ${user.status}. Please contact an administrator.`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
      error: error.message,
    });
  }
};

/**
 * Grant access to specific roles (Role-Based Access Control)
 * Superadmin has unrestricted global access across all endpoints.
 * @param  {...String} roles - Allowed roles ('superadmin', 'admin', 'hr', 'manager', 'teamlead', 'employee', 'intern')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to authorization check.',
      });
    }

    const userRole = (req.user.role || '').toLowerCase();

    // Superadmin has universal unrestricted access across all endpoints
    if (userRole === 'superadmin') {
      return next();
    }

    const normalizedAllowedRoles = roles.map((r) => r.toLowerCase());

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource. Required role(s): [${roles.join(', ')}]`,
      });
    }

    next();
  };
};

/**
 * Dynamic Permission Check Middleware
 * Verifies if the authenticated user's role has the required permission assigned
 * @param {String} permissionSlug - The permission key to check (e.g. 'employees', 'payroll')
 */
const checkPermission = (permissionSlug) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to permission check.',
      });
    }

    const userRole = (req.user.role || '').toLowerCase();

    // Superadmin has universal unrestricted access across all permissions
    if (userRole === 'superadmin') {
      return next();
    }

    try {
      const { Role } = require('../models/Role');
      const roleDoc = await Role.findOne({ slug: userRole });

      if (!roleDoc || !roleDoc.permissions.includes(permissionSlug)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Your role '${req.user.role}' lacks permission '${permissionSlug}' for this operation.`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error verifying permissions',
        error: error.message,
      });
    }
  };
};

module.exports = {
  protect,
  authorize,
  checkPermission,
};
