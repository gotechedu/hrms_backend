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
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Employee personal timesheets
router.post('/', protect, createTimesheet);
router.get('/my', protect, getMyTimesheets);
router.put('/:id', protect, updateTimesheet);
router.delete('/:id', protect, deleteTimesheet);

// Manager / Admin / HR review & approval
router.get('/', protect, checkPermission('projects'), getAllTimesheets);
router.put('/:id/status', protect, checkPermission('projects'), updateTimesheetStatus);

module.exports = router;
