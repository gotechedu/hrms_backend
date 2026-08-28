const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  updatePermissions,
} = require('../controllers/settingsController');

router.get('/', getSettings);
router.put('/', updateSettings);
router.put('/permissions', updatePermissions);

module.exports = router;
