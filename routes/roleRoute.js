const express = require('express');
const router = express.Router();
const {
  getRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
  assignRolePermissions,
} = require('../controllers/rolePermissionController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/', protect, getRoles);
router.post('/', protect, checkAnyPermission('manage_roles', 'manage_permissions'), createRole);
router.get('/:id', protect, getRoleById);
router.put('/:id', protect, checkAnyPermission('manage_roles', 'manage_permissions'), updateRole);
router.delete('/:id', protect, checkAnyPermission('manage_roles', 'manage_permissions'), deleteRole);
router.put('/:id/permissions', protect, checkAnyPermission('manage_roles', 'manage_permissions'), assignRolePermissions);

module.exports = router;
