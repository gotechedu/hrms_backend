const express = require('express');
const router = express.Router();
const {
  getPermissions,
  createPermission,
  getPermissionMatrix,
  updatePermissionMatrix,
} = require('../controllers/rolePermissionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getPermissions);
router.post('/', protect, authorize('superadmin', 'admin'), createPermission);
router.get('/matrix', protect, getPermissionMatrix);
router.put('/matrix', protect, authorize('superadmin', 'admin'), updatePermissionMatrix);

module.exports = router;
