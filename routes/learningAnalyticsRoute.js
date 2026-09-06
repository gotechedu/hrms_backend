const express = require('express');
const router = express.Router();
const {
  getLMSOverview,
  getBatchReport,
} = require('../controllers/learningAnalyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/overview', protect, authorize('superadmin', 'admin', 'trainer', 'hr'), getLMSOverview);
router.get('/batch-report/:batchId', protect, authorize('superadmin', 'admin', 'trainer'), getBatchReport);

module.exports = router;
