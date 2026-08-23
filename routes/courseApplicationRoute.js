const express = require('express');
const router = express.Router();
const {
  submitCourseApplication,
  getAllCourseApplications,
  updateCourseApplicationStatus,
  deleteCourseApplication,
} = require('../controllers/courseApplicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route - students apply from official website
router.post('/', submitCourseApplication);

// Protected routes - HRMS staff reviews applications
router.get('/', protect, authorize('superadmin', 'admin', 'hr', 'manager'), getAllCourseApplications);
router.put('/:id', protect, authorize('superadmin', 'admin', 'hr', 'manager'), updateCourseApplicationStatus);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'hr'), deleteCourseApplication);

module.exports = router;
