const express = require('express');
const router = express.Router();
const {
  createTimesheet,
  getMyTimesheets,
  getAllTimesheets,
  updateTimesheet,
  deleteTimesheet,
  updateTimesheetStatus,
} = require('../controllers/timesheetController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

// Employee personal timesheets
router.post('/', protect, createTimesheet);
router.get('/my', protect, getMyTimesheets);
router.put('/:id', protect, updateTimesheet);
router.delete('/:id', protect, deleteTimesheet);

// Manager / Admin / HR review & approval
router.get('/', protect, checkAnyPermission('manage_timesheet', 'view_timesheet'), getAllTimesheets);
router.put('/:id/status', protect, checkAnyPermission('manage_timesheet', 'approve_timesheet'), updateTimesheetStatus);

module.exports = router;
