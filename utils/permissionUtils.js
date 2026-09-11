/**
 * Enterprise Backend Role-Based Access Control (RBAC) & Feature Permission Utility
 *
 * Handles role-based access, granular feature permissions (add/edit/delete/view project,
 * view/add/manage attendance, etc.), spelling variations (attendance vs attandance),
 * dynamic new permissions, superadmin bypass, and Express route middlewares.
 */

// ==========================================
// 1. DEFAULT ROLE PERMISSIONS MATRIX
// ==========================================
const DEFAULT_ROLE_PERMISSIONS = {
  superadmin: ['*'],
  sales_manager: [
    'manage_employee',
    'create_employee',
    'manage_attandance',
    'manage_timesheet',
    'manage_holiday',
    'manage_task',
  ],
  development_manager: [
    'manage_employee',
    'create_employee',
    'manage_attandance',
    'manage_timesheet',
    'manage_holiday',
    'manage_task',
  ],
  deployment_manager: [
    'manage_employee',
    'create_employee',
    'manage_learninghub',
    'manage_attandance',
    'manage_timesheet',
    'manage_holiday',
    'manage_task',
  ],
  employee: [
    'manage_blogs',
    'manage_attandance',
    'manage_timesheet',
    'manage_project',
    'manage_holiday',
    'manage_task',
  ],
  trainer: [
    'view_learninghub',
    'manage_learninghub',
    'manage_classes',
    'manage_attendance',
    'manage_assignments',
    'grade_submissions',
    'manage_assessments',
  ],
  trainee: [
    'view_learninghub',
    'access_enrolled_content',
    'submit_assignments',
    'take_assessments',
    'view_certificates',
  ],
  intern: [
    'manage_attandance',
    'manage_timesheet',
    'manage_holiday',
    'manage_task',
  ],
  hr: [
    'manage_career',
    'manage_blogs',
    'manage_attandance',
    'manage_timesheet',
    'manage_holiday',
    'manage_task',
  ],
  support_staff: [
    'manage_attandance',
    'manage_timesheet',
    'manage_holiday',
  ],
};

// ==========================================
// 2. PERMISSION ALIASES & NORMALIZATIONS
// ==========================================
const PERMISSION_ALIASES = {
  // Attendance variations
  manage_attendance: ['manage_attandance', 'attendance_manage'],
  manage_attandance: ['manage_attendance', 'attendance_manage'],
  view_attendance: ['view_attandance', 'read_attendance', 'read_attandance', 'attendance_view'],
  view_attandance: ['view_attendance', 'read_attendance', 'read_attandance', 'attendance_view'],
  add_attendance: ['add_attandance', 'create_attendance', 'create_attandance', 'punch_attendance'],
  add_attandance: ['add_attendance', 'create_attendance', 'create_attandance', 'punch_attendance'],
  create_attendance: ['create_attandance', 'add_attendance', 'add_attandance'],
  create_attandance: ['create_attendance', 'add_attendance', 'add_attandance'],

  // Project operations
  manage_project: ['manage_projects', 'project_manage', 'projects_manage'],
  create_project: ['add_project', 'new_project', 'project_create'],
  add_project: ['create_project', 'new_project', 'project_add'],
  edit_project: ['update_project', 'modify_project', 'project_edit'],
  update_project: ['edit_project', 'modify_project', 'project_update'],
  delete_project: ['remove_project', 'destroy_project', 'project_delete'],
  remove_project: ['delete_project', 'destroy_project'],
  view_project: ['read_project', 'list_projects', 'view_projects', 'project_view'],

  // Employee operations
  manage_employee: ['manage_employees', 'employee_manage'],
  create_employee: ['add_employee', 'new_employee', 'employee_create'],
  add_employee: ['create_employee', 'new_employee'],
  edit_employee: ['update_employee', 'modify_employee', 'employee_edit'],
  update_employee: ['edit_employee', 'modify_employee'],
  delete_employee: ['remove_employee', 'employee_delete'],
  remove_employee: ['delete_employee'],
  view_employee: ['read_employee', 'list_employees', 'view_employees'],

  // Learning Hub
  manage_learninghub: ['manage_learning_hub', 'manage_courses', 'manage_course'],
  view_learninghub: ['view_learning_hub', 'view_courses', 'view_course'],

  // Tasks & Timesheets
  manage_task: ['manage_tasks', 'task_manage'],
  manage_timesheet: ['manage_timesheets', 'timesheet_manage'],

  // Blogs, Careers, Holidays
  manage_blogs: ['manage_blog', 'blog_manage'],
  manage_career: ['manage_careers', 'manage_jobs', 'career_manage'],
  manage_holiday: ['manage_holidays', 'holiday_manage'],
};

// ==========================================
// 3. RUNTIME EXTENSIBILITY REGISTRY
// ==========================================
const customRoles = new Map();
const customPermissions = new Set();
const customAliases = new Map();

/**
 * Register a newly created permission dynamically at runtime
 */
const registerPermission = (permissionSlug, options = {}) => {
  if (!permissionSlug) return;
  const slug = String(permissionSlug).toLowerCase().trim();
  customPermissions.add(slug);

  if (Array.isArray(options.aliases)) {
    const existing = customAliases.get(slug) || [];
    customAliases.set(slug, [...new Set([...existing, ...options.aliases.map((a) => String(a).toLowerCase().trim())])]);
  }

  if (Array.isArray(options.defaultRoles)) {
    options.defaultRoles.forEach((role) => {
      const normalizedRole = String(role).toLowerCase().trim();
      const rolePerms = customRoles.get(normalizedRole) || DEFAULT_ROLE_PERMISSIONS[normalizedRole] || [];
      if (!rolePerms.includes(slug)) {
        customRoles.set(normalizedRole, [...rolePerms, slug]);
      }
    });
  }
};

/**
 * Register a new role or customize role permissions dynamically
 */
const registerRole = (roleSlug, permissions = []) => {
  if (!roleSlug) return;
  const slug = String(roleSlug).toLowerCase().trim();
  const perms = permissions.map((p) => String(p).toLowerCase().trim());
  customRoles.set(slug, perms);
};

// ==========================================
// 4. CORE RESOLVERS & EXTRACTION HELPERS
// ==========================================

const getUserRole = (user) => {
  if (!user) return '';
  if (typeof user === 'string') return user.toLowerCase().trim();
  if (typeof user.role === 'string') return user.role.toLowerCase().trim();
  if (user.role && typeof user.role.slug === 'string') return user.role.slug.toLowerCase().trim();
  if (user.role && typeof user.role.name === 'string') return user.role.name.toLowerCase().trim();
  return '';
};

const isSuperAdmin = (user) => {
  const role = getUserRole(user);
  if (role === 'superadmin') return true;
  const perms = getUserPermissions(user, false);
  return perms.includes('*') || perms.includes('all');
};

const getUserPermissions = (user, fallbackToDefaults = true) => {
  if (!user) return [];

  // Array passed directly
  if (Array.isArray(user)) {
    return user
      .filter((p) => p && typeof p === 'string')
      .map((p) => p.toLowerCase().trim());
  }

  // User object with permissions array
  if (typeof user === 'object' && Array.isArray(user.permissions)) {
    const valid = user.permissions
      .filter((p) => p && typeof p === 'string')
      .map((p) => p.toLowerCase().trim());
    if (valid.length > 0) return valid;
  }

  // Fall back to role-based permissions matrix
  if (fallbackToDefaults) {
    const role = getUserRole(user);
    if (role) {
      if (customRoles.has(role)) {
        return customRoles.get(role);
      }
      if (DEFAULT_ROLE_PERMISSIONS[role]) {
        return [...DEFAULT_ROLE_PERMISSIONS[role]];
      }
    }
  }

  return [];
};

const hasPermission = (user, permission) => {
  if (!user || !permission) return false;
  if (isSuperAdmin(user)) return true;

  const target = String(permission).toLowerCase().trim();
  const permissions = getUserPermissions(user);

  // Direct match
  if (permissions.includes(target)) return true;

  // Predefined aliases
  const aliases = PERMISSION_ALIASES[target] || [];
  for (const alias of aliases) {
    if (permissions.includes(alias)) return true;
  }

  // Custom runtime aliases
  const runtimeAliases = customAliases.get(target) || [];
  for (const alias of runtimeAliases) {
    if (permissions.includes(alias)) return true;
  }

  // Reverse alias check
  for (const p of permissions) {
    const pAliases = PERMISSION_ALIASES[p];
    if (pAliases && pAliases.includes(target)) return true;

    const pCustom = customAliases.get(p);
    if (pCustom && pCustom.includes(target)) return true;
  }

  // Wildcards
  for (const p of permissions) {
    if (p === '*') return true;
    if (p.endsWith('*') && target.startsWith(p.slice(0, -1))) return true;
    if (p.includes(':*') && target.startsWith(p.replace(':*', ''))) return true;
  }

  return false;
};

const hasAnyPermission = (user, permissions = []) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (!Array.isArray(permissions) || permissions.length === 0) return false;
  return permissions.some((perm) => hasPermission(user, perm));
};

const hasAllPermissions = (user, permissions = []) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (!Array.isArray(permissions) || permissions.length === 0) return false;
  return permissions.every((perm) => hasPermission(user, perm));
};

// ==========================================
// 5. ACTION-BASED GRANULAR PERMISSION RESOLVER
// ==========================================

const ACTION_MAP = {
  add: 'create',
  create: 'create',
  new: 'create',
  insert: 'create',
  post: 'create',

  edit: 'edit',
  update: 'edit',
  modify: 'edit',
  patch: 'edit',
  put: 'edit',

  delete: 'delete',
  remove: 'delete',
  destroy: 'delete',
  del: 'delete',

  view: 'view',
  read: 'view',
  get: 'view',
  list: 'view',
  show: 'view',

  manage: 'manage',
  admin: 'manage',
  all: 'manage',
};

const FEATURE_SYNONYMS = {
  attendance: ['attandance', 'attendance'],
  attandance: ['attandance', 'attendance'],
  project: ['project', 'projects'],
  projects: ['project', 'projects'],
  employee: ['employee', 'employees'],
  employees: ['employee', 'employees'],
  task: ['task', 'tasks'],
  tasks: ['task', 'tasks'],
  timesheet: ['timesheet', 'timesheets'],
  timesheets: ['timesheet', 'timesheets'],
  learninghub: ['learninghub', 'learning_hub', 'courses', 'course'],
  blog: ['blog', 'blogs'],
  blogs: ['blog', 'blogs'],
  career: ['career', 'careers', 'job', 'jobs'],
  holiday: ['holiday', 'holidays'],
};

const can = (user, action, feature, context = {}) => {
  if (!user || !action || !feature) return false;
  if (isSuperAdmin(user)) return true;

  const rawAction = String(action).toLowerCase().trim();
  const rawFeature = String(feature).toLowerCase().trim();
  const normalizedAction = ACTION_MAP[rawAction] || rawAction;
  const featureVariants = FEATURE_SYNONYMS[rawFeature] || [rawFeature];

  const candidateKeys = [];

  for (const feat of featureVariants) {
    // 1. Action-specific permission
    candidateKeys.push(`${normalizedAction}_${feat}`);
    candidateKeys.push(`${rawAction}_${feat}`);
    candidateKeys.push(`${feat}_${normalizedAction}`);
    candidateKeys.push(`${feat}_${rawAction}`);
    candidateKeys.push(`${feat}:${normalizedAction}`);

    // 2. High-level 'manage' permission
    candidateKeys.push(`manage_${feat}`);
    candidateKeys.push(`${feat}_manage`);

    // 3. For view
    if (normalizedAction === 'view') {
      candidateKeys.push(`view_${feat}`);
      candidateKeys.push(`read_${feat}`);
      candidateKeys.push(`list_${feat}`);
    }
  }

  for (const permKey of candidateKeys) {
    if (hasPermission(user, permKey)) {
      return true;
    }
  }

  if (
    featureVariants.includes('attendance') &&
    (normalizedAction === 'view' || normalizedAction === 'create') &&
    context &&
    context.isSelf
  ) {
    return true;
  }

  if (normalizedAction === 'view') {
    for (const feat of featureVariants) {
      if (
        hasPermission(user, `create_${feat}`) ||
        hasPermission(user, `edit_${feat}`) ||
        hasPermission(user, `manage_${feat}`)
      ) {
        return true;
      }
    }
  }

  return false;
};

// ==========================================
// 6. GRANULAR FEATURE HELPERS
// ==========================================

// Projects
const canViewProject = (user) => can(user, 'view', 'project');
const canAddProject = (user) => can(user, 'create', 'project');
const canCreateProject = canAddProject;
const canEditProject = (user, project) => can(user, 'edit', 'project', { project });
const canDeleteProject = (user, project) => can(user, 'delete', 'project', { project });
const canManageProject = (user) => hasPermission(user, 'manage_project');

// Attendance
const canViewAttendance = (user, context = {}) => can(user, 'view', 'attendance', context);
const canAddAttendance = (user, context = {}) => can(user, 'create', 'attendance', context);
const canPunchAttendance = canAddAttendance;
const canEditAttendance = (user) => can(user, 'edit', 'attendance');
const canDeleteAttendance = (user) => can(user, 'delete', 'attendance');
const canManageAttendance = (user) =>
  hasPermission(user, 'manage_attendance') || hasPermission(user, 'manage_attandance');

// Employees
const canViewEmployee = (user) => can(user, 'view', 'employee');
const canAddEmployee = (user) => can(user, 'create', 'employee');
const canCreateEmployee = canAddEmployee;
const canEditEmployee = (user) => can(user, 'edit', 'employee');
const canDeleteEmployee = (user) => can(user, 'delete', 'employee');
const canManageEmployee = (user) => hasPermission(user, 'manage_employee');

// Tasks & Timesheets
const canViewTask = (user) => can(user, 'view', 'task');
const canAddTask = (user) => can(user, 'create', 'task');
const canManageTask = (user) => hasPermission(user, 'manage_task');
const canViewTimesheet = (user) => can(user, 'view', 'timesheet');
const canManageTimesheet = (user) => hasPermission(user, 'manage_timesheet');

// Learning Hub
const canViewLearningHub = (user) =>
  hasPermission(user, 'view_learninghub') || hasPermission(user, 'manage_learninghub');
const canManageLearningHub = (user) => hasPermission(user, 'manage_learninghub');
const canManageClasses = (user) => hasPermission(user, 'manage_classes');
const canManageAssignments = (user) => hasPermission(user, 'manage_assignments');
const canSubmitAssignments = (user) => hasPermission(user, 'submit_assignments');
const canGradeSubmissions = (user) => hasPermission(user, 'grade_submissions');
const canTakeAssessments = (user) => hasPermission(user, 'take_assessments');
const canManageAssessments = (user) => hasPermission(user, 'manage_assessments');
const canViewCertificates = (user) => hasPermission(user, 'view_certificates');
const canAccessEnrolledContent = (user) => hasPermission(user, 'access_enrolled_content');

// Blogs, Career, Holiday
const canManageBlogs = (user) => hasPermission(user, 'manage_blogs');
const canManageCareer = (user) => hasPermission(user, 'manage_career');
const canManageHoliday = (user) => hasPermission(user, 'manage_holiday');

// ==========================================
// 7. EXPRESS MIDDLEWARES
// ==========================================

/**
 * Express Middleware to require a permission or action
 *
 * Usage:
 *   router.post('/projects', protect, requirePermission('create', 'project'), createProject);
 *   router.post('/projects', protect, requirePermission('add_project'), createProject);
 *   router.delete('/projects/:id', protect, requirePermission('delete', 'project'), deleteProject);
 *   router.post('/attendance', protect, requirePermission('create', 'attendance'), recordAttendance);
 *   router.get('/reports/payroll', protect, requirePermission('export_payroll'), exportReport); // New custom permission!
 */
const requirePermission = (permissionOrAction, feature) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to permission check.',
      });
    }

    let isAuthorized = false;

    if (feature) {
      // Called as requirePermission('add', 'project')
      isAuthorized = can(req.user, permissionOrAction, feature);
    } else {
      // Called as requirePermission('manage_project')
      isAuthorized = hasPermission(req.user, permissionOrAction);
    }

    if (!isAuthorized) {
      const needed = feature ? `${permissionOrAction} on ${feature}` : permissionOrAction;
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role '${req.user.role}' lacks permission for '${needed}'.`,
      });
    }

    next();
  };
};

/**
 * Express Middleware to require ANY permission in a list
 */
const requireAnyPermission = (permissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to permission check.',
      });
    }

    if (!hasAnyPermission(req.user, permissions)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Lacks required permissions [${permissions.join(', ')}].`,
      });
    }

    next();
  };
};

/**
 * Express Middleware to restrict route to specific roles
 */
const requireRole = (allowedRoles = []) => {
  const normalizedRoles = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map((r) =>
    String(r).toLowerCase().trim()
  );

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userRole = getUserRole(req.user);
    if (userRole === 'superadmin' || normalizedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: Role '${req.user.role}' is not authorized. Allowed: ${normalizedRoles.join(', ')}`,
    });
  };
};

module.exports = {
  // Core checks
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  can,
  isSuperAdmin,
  getUserRole,
  getUserPermissions,

  // Runtime registry
  registerPermission,
  registerRole,

  // Project feature permissions
  canViewProject,
  canAddProject,
  canCreateProject,
  canEditProject,
  canDeleteProject,
  canManageProject,

  // Attendance feature permissions
  canViewAttendance,
  canAddAttendance,
  canPunchAttendance,
  canEditAttendance,
  canDeleteAttendance,
  canManageAttendance,

  // Employee feature permissions
  canViewEmployee,
  canAddEmployee,
  canCreateEmployee,
  canEditEmployee,
  canDeleteEmployee,
  canManageEmployee,

  // Task & Timesheet feature permissions
  canViewTask,
  canAddTask,
  canManageTask,
  canViewTimesheet,
  canManageTimesheet,

  // Learning Hub
  canViewLearningHub,
  canManageLearningHub,
  canManageClasses,
  canManageAssignments,
  canSubmitAssignments,
  canGradeSubmissions,
  canTakeAssessments,
  canManageAssessments,
  canViewCertificates,
  canAccessEnrolledContent,

  // Blogs, Careers, Holidays
  canManageBlogs,
  canManageCareer,
  canManageHoliday,

  // Express Middlewares
  requirePermission,
  requireAnyPermission,
  requireRole,

  // Constants
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_ALIASES,
};
