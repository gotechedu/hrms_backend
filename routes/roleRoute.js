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
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getRoles);
router.post('/', protect, authorize('superadmin', 'admin'), createRole);
router.get('/:id', protect, getRoleById);
router.put('/:id', protect, authorize('superadmin', 'admin'), updateRole);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteRole);
router.put('/:id/permissions', protect, authorize('superadmin', 'admin'), assignRolePermissions);

module.exports = router;
