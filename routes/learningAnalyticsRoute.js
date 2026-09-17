const express = require('express');
const router = express.Router();
const {
  getLMSOverview,
  getBatchReport,
} = require('../controllers/learningAnalyticsController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/overview', protect, checkAnyPermission('view_learninghub', 'manage_learninghub'), getLMSOverview);
router.get('/batch-report/:batchId', protect, checkAnyPermission('view_learninghub', 'manage_learninghub'), getBatchReport);

module.exports = router;
