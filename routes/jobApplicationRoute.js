const express = require('express');
const router = express.Router();
const {
  submitJobApplication,
  getJobApplicationById,
  getAllJobApplications,
  updateJobApplicationStage,
  deleteJobApplication,
} = require('../controllers/jobApplicationController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');
const { formSubmitLimiter } = require('../middleware/securityMiddleware');
const { validateJobApplicationInput } = require('../middleware/validatorMiddleware');

// Public route - candidates apply from official website
router.post('/', formSubmitLimiter, validateJobApplicationInput, submitJobApplication);

// Protected routes - HRMS staff reviews candidates
router.get('/', protect, checkAnyPermission('view_career', 'manage_applications', 'manage_career'), getAllJobApplications);
router.get('/:id', protect, checkAnyPermission('view_career', 'manage_applications', 'manage_career'), getJobApplicationById);
router.put('/:id', protect, checkAnyPermission('manage_applications', 'manage_career'), updateJobApplicationStage);
router.delete('/:id', protect, checkAnyPermission('manage_applications', 'manage_career'), deleteJobApplication);

module.exports = router;
