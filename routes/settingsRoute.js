const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  updatePermissions,
} = require('../controllers/settingsController');

const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/', protect, getSettings);
router.put('/', protect, checkAnyPermission('manage_settings', 'settings'), updateSettings);
router.put('/permissions', protect, checkAnyPermission('manage_settings', 'manage_permissions', 'settings'), updatePermissions);

module.exports = router;
