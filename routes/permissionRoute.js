const express = require('express');
const router = express.Router();
const {
  getPermissions,
  createPermission,
  getPermissionMatrix,
  updatePermissionMatrix,
} = require('../controllers/rolePermissionController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/', protect, getPermissions);
router.post('/', protect, checkAnyPermission('manage_roles', 'manage_permissions'), createPermission);
router.get('/matrix', protect, getPermissionMatrix);
router.put('/matrix', protect, checkAnyPermission('manage_roles', 'manage_permissions'), updatePermissionMatrix);

module.exports = router;
