const express = require('express');
const router = express.Router();
const {
  submitJobApplication,
  getJobApplicationById,
  getAllJobApplications,
  updateJobApplicationStage,
  deleteJobApplication,
} = require('../controllers/jobApplicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route - candidates apply from official website
router.post('/', submitJobApplication);

// Protected routes - HRMS staff reviews candidates
router.get('/', protect, authorize('superadmin', 'admin', 'hr', 'manager'), getAllJobApplications);
router.get('/:id', protect, authorize('superadmin', 'admin', 'hr', 'manager'), getJobApplicationById);
router.put('/:id', protect, authorize('superadmin', 'admin', 'hr', 'manager'), updateJobApplicationStage);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'hr'), deleteJobApplication);

module.exports = router;
