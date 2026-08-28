const express = require('express');
const router = express.Router();
const {
  clockIn,
  clockOut,
  getTodayStatus,
  getMyAttendance,
  getAllAttendance,
  applyLeave,
  getLeaveRequests,
  updateLeaveStatus,
} = require('../controllers/attendanceController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Punch Endpoints (All logged-in employees)
router.post('/clock-in', protect, clockIn);
router.post('/clock-out', protect, clockOut);
router.get('/today', protect, getTodayStatus);
router.get('/my', protect, getMyAttendance);

// Leaves Management
router.post('/leave', protect, applyLeave);
router.get('/leaves', protect, getLeaveRequests);
router.put('/leaves/:id', protect, checkPermission('attendance'), updateLeaveStatus);

// Organization Roster (Protected by attendance permission / managers)
router.get('/', protect, checkPermission('attendance'), getAllAttendance);

module.exports = router;
