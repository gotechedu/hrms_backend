const express = require('express');
const router = express.Router();
const {
  getClassAttendance,
  markClassAttendance,
  getMyAttendance,
} = require('../controllers/learningAttendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/my-attendance', protect, getMyAttendance);
router.get('/class/:classId', protect, authorize('superadmin', 'admin', 'trainer'), getClassAttendance);
router.post('/batch-mark', protect, authorize('superadmin', 'admin', 'trainer'), markClassAttendance);

module.exports = router;
