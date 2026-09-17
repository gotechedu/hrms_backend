const express = require('express');
const router = express.Router();
const {
  getClassAttendance,
  markClassAttendance,
  getMyAttendance,
} = require('../controllers/learningAttendanceController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/my-attendance', protect, getMyAttendance);
router.get('/class/:classId', protect, checkAnyPermission('manage_attendance', 'manage_learninghub', 'view_learninghub'), getClassAttendance);
router.post('/batch-mark', protect, checkAnyPermission('manage_attendance', 'manage_learninghub'), markClassAttendance);

module.exports = router;
