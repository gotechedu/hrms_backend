const express = require('express');
const router = express.Router();
const {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} = require('../controllers/jobController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

// Public routes (used by official website & HRMS)
router.get('/', getAllJobs);
router.get('/:id', getJobById);

// Protected routes (Roles with manage_career permission)
router.post('/', protect, checkAnyPermission('manage_career'), createJob);
router.put('/:id', protect, checkAnyPermission('manage_career'), updateJob);
router.delete('/:id', protect, checkAnyPermission('manage_career'), deleteJob);

module.exports = router;
