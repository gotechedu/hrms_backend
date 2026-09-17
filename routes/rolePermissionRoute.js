const express = require('express');
const router = express.Router();
const {
  getRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
  assignRolePermissions,
  getPermissions,
  createPermission,
  getPermissionMatrix,
  updatePermissionMatrix,
} = require('../controllers/rolePermissionController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

// Public/Protected Routes for Roles
router.get('/roles', protect, getRoles);
router.post('/roles', protect, checkAnyPermission('manage_roles', 'manage_permissions'), createRole);
router.get('/roles/:id', protect, getRoleById);
router.put('/roles/:id', protect, checkAnyPermission('manage_roles', 'manage_permissions'), updateRole);
router.delete('/roles/:id', protect, checkAnyPermission('manage_roles', 'manage_permissions'), deleteRole);
router.put('/roles/:id/permissions', protect, checkAnyPermission('manage_roles', 'manage_permissions'), assignRolePermissions);

// Permissions & Matrix
router.get('/permissions', protect, getPermissions);
router.post('/permissions', protect, checkAnyPermission('manage_roles', 'manage_permissions'), createPermission);
router.get('/permissions/matrix', protect, getPermissionMatrix);
router.put('/permissions/matrix', protect, checkAnyPermission('manage_roles', 'manage_permissions'), updatePermissionMatrix);

module.exports = router;
