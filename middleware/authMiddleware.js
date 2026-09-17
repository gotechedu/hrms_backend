const jwt = require("jsonwebtoken");
const { User } = require("../models/User");
const { Role } = require("../models/Role");
const {
  hasPermission: checkUserHasPermission,
  can: checkUserCan,
  requirePermission,
  DEFAULT_ROLE_PERMISSIONS,
} = require("../utils/permissionUtils");

/**
 * Helper to resolve dynamic permissions for a user's role from DB or defaults
 */
const resolveUserPermissions = async (user) => {
  const userRole = (user.role || "").toLowerCase().trim();
  const isSuperAdmin = userRole === "superadmin";

  let permissions = [];
  if (isSuperAdmin) {
    permissions = ["*"];
  } else {
    try {
      const roleDoc = await Role.findOne({
        $or: [{ slug: userRole }, { slug: new RegExp(`^${userRole}$`, "i") }],
      });
      if (roleDoc && Array.isArray(roleDoc.permissions)) {
        permissions = roleDoc.permissions;
      } else if (
        Array.isArray(user.permissions) &&
        user.permissions.length > 0
      ) {
        permissions = user.permissions;
      } else {
        permissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];
      }
    } catch (e) {
      permissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];
    }
  }

  // Bind RBAC capabilities directly onto user
  user.permissions = permissions;
  user.isSuperAdmin = isSuperAdmin;
  user.hasPermission = (slug) => {
    if (isSuperAdmin) return true;
    return checkUserHasPermission({ role: userRole, permissions }, slug);
  };
  user.can = (action, feature) => {
    if (isSuperAdmin) return true;
    return checkUserCan({ role: userRole, permissions }, action, feature);
  };
  user.hasAnyPermission = (...slugs) => {
    if (isSuperAdmin) return true;
    return slugs.some((s) => {
      if (typeof s === "string" && s.includes(":")) {
        const [act, feat] = s.split(":");
        return user.can(act, feat);
      }
      return user.hasPermission(s);
    });
  };

  return user;
};

/**
 * Protect routes - Verify JWT token, load role and assigned permissions, attach user to request
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message:
        "Not authorized to access this route. No authentication token provided.",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "gotech_hrms_super_secret_jwt_key_2026_secure",
    );

    const user = await User.findById(decoded.id).populate("employeeProfile");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The user belonging to this token no longer exists.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Your account is currently ${user.status}. Please contact an administrator.`,
      });
    }

    // Resolve assigned role permissions and attach to req.user
    await resolveUserPermissions(user);
    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
      error: error.message,
    });
  }
};

/**
 * Grant access to specific roles or dynamic permission holders
 * Checks if user has an allowed role OR has been granted dynamic permissions in MongoDB matrix.
 * Superadmin has universal unrestricted access across all endpoints.
 * @param  {...String} roles - Allowed roles or permission keys
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required prior to authorization check.",
      });
    }

    const userRole = (req.user.role || "").toLowerCase().trim();

    // 1. Superadmin has universal unrestricted access across all endpoints
    if (req.user.isSuperAdmin || userRole === "superadmin") {
      return next();
    }

    const normalizedAllowedRoles = roles.map((r) => r.toLowerCase().trim());

    // 2. Direct role match
    if (normalizedAllowedRoles.includes(userRole)) {
      return next();
    }

    // 3. Check if user has ANY permission that matches items passed in roles list
    if (req.user.hasAnyPermission && req.user.hasAnyPermission(...roles)) {
      return next();
    }

    // 4. Dynamic Permission Matrix Inspection:
    // If the user's role is not in the static role list, check if the user's assigned permissions
    // from MongoDB permission matrix allow access to this resource domain.
    const urlPath = `${req.baseUrl || ""}${req.path || ""}`.toLowerCase();
    const method = (req.method || "GET").toUpperCase();

    let hasDomainPermission = false;

    if (urlPath.includes("/contact")) {
      hasDomainPermission =
        method === "GET"
          ? req.user.hasAnyPermission(
              "view_contacts",
              "manage_contacts",
              "manage_contact",
              "contacts",
            )
          : req.user.hasAnyPermission(
              "manage_contacts",
              "manage_contact",
              "contacts",
            );
    } else if (
      urlPath.includes("/job-application") ||
      urlPath.includes("/job") ||
      urlPath.includes("/career")
    ) {
      hasDomainPermission =
        method === "GET"
          ? req.user.hasAnyPermission(
              "view_career",
              "manage_career",
              "manage_applications",
              "career",
              "jobs",
            )
          : req.user.hasAnyPermission(
              "manage_career",
              "manage_applications",
              "career",
              "jobs",
            );
    } else if (urlPath.includes("/offer")) {
      hasDomainPermission = req.user.hasAnyPermission(
        "manage_career",
        "view_career",
        "manage_learninghub",
        "view_learninghub",
        "manage_settings",
        "offers",
      );
    } else if (urlPath.includes("/course-application")) {
      hasDomainPermission = req.user.hasAnyPermission(
        "manage_learninghub",
        "view_learninghub",
        "manage_applications",
        "manage_career",
      );
    } else if (
      urlPath.includes("/course") ||
      urlPath.includes("/batch") ||
      urlPath.includes("/class") ||
      urlPath.includes("/curriculum") ||
      urlPath.includes("/enrollment") ||
      urlPath.includes("/assignment") ||
      urlPath.includes("/assessment") ||
      urlPath.includes("/certificate") ||
      urlPath.includes("/learning") ||
      urlPath.includes("/trainer")
    ) {
      if (method === "GET") {
        hasDomainPermission = req.user.hasAnyPermission(
          "view_learninghub",
          "manage_learninghub",
          "manage_batches",
          "manage_trainers",
          "manage_classes",
          "manage_attendance",
          "manage_assignments",
          "learninghub",
        );
      } else {
        hasDomainPermission = req.user.hasAnyPermission(
          "manage_learninghub",
          "manage_batches",
          "manage_trainers",
          "manage_classes",
          "manage_attendance",
          "manage_assignments",
          "grade_submissions",
          "manage_assessments",
          "issue_certificates",
          "learninghub",
        );
      }
    } else if (urlPath.includes("/employee")) {
      hasDomainPermission =
        method === "GET"
          ? req.user.hasAnyPermission(
              "view_employee",
              "manage_employee",
              "employee",
              "employees",
            )
          : req.user.hasAnyPermission(
              "create_employee",
              "update_employee",
              "delete_employee",
              "manage_employee",
              "employee",
            );
    } else if (urlPath.includes("/attendance")) {
      hasDomainPermission = req.user.hasAnyPermission(
        "view_attendance",
        "manage_attendance",
        "manage_attandance",
        "add_attendance",
        "attendance",
      );
    } else if (urlPath.includes("/timesheet")) {
      hasDomainPermission = req.user.hasAnyPermission(
        "view_timesheet",
        "manage_timesheet",
        "add_timesheet",
        "timesheet",
      );
    } else if (urlPath.includes("/project")) {
      hasDomainPermission =
        method === "GET"
          ? req.user.hasAnyPermission(
              "view_project",
              "manage_project",
              "project",
              "projects",
            )
          : req.user.hasAnyPermission(
              "create_project",
              "add_project",
              "update_project",
              "edit_project",
              "delete_project",
              "manage_project",
              "project",
            );
    } else if (urlPath.includes("/task")) {
      hasDomainPermission =
        method === "GET"
          ? req.user.hasAnyPermission(
              "view_task",
              "manage_task",
              "task",
              "tasks",
            )
          : req.user.hasAnyPermission(
              "add_task",
              "update_task",
              "delete_task",
              "manage_task",
              "task",
            );
    } else if (urlPath.includes("/payroll")) {
      hasDomainPermission =
        method === "GET"
          ? req.user.hasAnyPermission(
              "view_payroll",
              "manage_payroll",
              "payroll",
            )
          : req.user.hasAnyPermission(
              "manage_payroll",
              "export_payroll",
              "payroll",
            );
    } else if (urlPath.includes("/blog")) {
      hasDomainPermission =
        method === "GET"
          ? req.user.hasAnyPermission(
              "view_blogs",
              "manage_blogs",
              "blogs",
              "blog",
            )
          : req.user.hasAnyPermission("manage_blogs", "blogs", "blog");
    } else if (urlPath.includes("/discussion")) {
      hasDomainPermission = req.user.hasAnyPermission(
        "view_discussions",
        "manage_discussions",
        "discussions",
      );
    } else if (urlPath.includes("/policy") || urlPath.includes("/grievance")) {
      hasDomainPermission = req.user.hasAnyPermission(
        "view_policy",
        "manage_policy",
        "view_grievance",
        "manage_grievance",
        "policy",
      );
    } else if (
      urlPath.includes("/setting") ||
      urlPath.includes("/role") ||
      urlPath.includes("/permission")
    ) {
      hasDomainPermission = req.user.hasAnyPermission(
        "manage_settings",
        "manage_roles",
        "manage_permissions",
        "settings",
      );
    } else if (urlPath.includes("/recycle")) {
      hasDomainPermission = req.user.hasAnyPermission(
        "view_recycle_bin",
        "manage_recycle_bin",
        "recycle_bin",
      );
    } else if (urlPath.includes("/holiday")) {
      hasDomainPermission =
        method === "GET"
          ? req.user.hasAnyPermission(
              "view_holiday",
              "manage_holiday",
              "holiday",
            )
          : req.user.hasAnyPermission(
              "add_holiday",
              "manage_holiday",
              "holiday",
            );
    }

    if (hasDomainPermission) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource. Required role(s): [${roles.join(", ")}]`,
    });
  };
};

/**
 * Dynamic Permission Check Middleware
 * Verifies if the authenticated user's role has the required permission assigned
 * @param {String} permissionSlug - The permission key to check (e.g. 'employees', 'payroll')
 */
const checkPermission = (permissionSlug, feature) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required prior to permission check.",
      });
    }

    // Superadmin has universal unrestricted access across all permissions
    if (req.user.isSuperAdmin) {
      return next();
    }

    const granted = feature
      ? req.user.can
        ? req.user.can(permissionSlug, feature)
        : false
      : req.user.hasPermission
        ? req.user.hasPermission(permissionSlug)
        : false;

    if (!granted) {
      const requiredLabel = feature
        ? `${permissionSlug} on ${feature}`
        : permissionSlug;
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role '${req.user.role}' lacks permission for '${requiredLabel}'.`,
      });
    }

    next();
  };
};

/**
 * Check if the user has ANY of the specified permissions or actions
 */
const checkAnyPermission = (...permissionsList) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (req.user.isSuperAdmin) {
      return next();
    }

    const isGranted = req.user.hasAnyPermission
      ? req.user.hasAnyPermission(...permissionsList)
      : permissionsList.some((p) => {
          if (typeof p === "string" && p.includes(":")) {
            const [act, feat] = p.split(":");
            return req.user.can ? req.user.can(act, feat) : false;
          }
          return req.user.hasPermission ? req.user.hasPermission(p) : false;
        });
    if (!isGranted) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role '${req.user.role}' lacks required permissions: [${permissionsList.join(", ")}]`,
      });
    }

    next();
  };
};

/**
 * Optional Protect - Attach user and permissions if token is present, but don't reject if not
 */
const optionalProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "gotech_hrms_super_secret_jwt_key_2026_secure",
    );

    const user = await User.findById(decoded.id).populate("employeeProfile");
    if (user && user.status === "active") {
      await resolveUserPermissions(user);
      req.user = user;
    } else {
      req.user = null;
    }
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  protect,
  optionalProtect,
  authorize,
  checkPermission,
  checkAnyPermission,
  requirePermission,
};
