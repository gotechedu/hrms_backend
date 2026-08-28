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
const { protect, authorize } = require('../middleware/authMiddleware');

// Public/Protected Routes for Roles
router.get('/roles', protect, getRoles);
router.post('/roles', protect, authorize('superadmin', 'admin'), createRole);
router.get('/roles/:id', protect, getRoleById);
router.put('/roles/:id', protect, authorize('superadmin', 'admin'), updateRole);
router.delete('/roles/:id', protect, authorize('superadmin', 'admin'), deleteRole);
router.put('/roles/:id/permissions', protect, authorize('superadmin', 'admin'), assignRolePermissions);

// Permissions & Matrix
router.get('/permissions', protect, getPermissions);
router.post('/permissions', protect, authorize('superadmin', 'admin'), createPermission);
router.get('/permissions/matrix', protect, getPermissionMatrix);
router.put('/permissions/matrix', protect, authorize('superadmin', 'admin'), updatePermissionMatrix);

module.exports = router;
