const express = require('express');
const router = express.Router();
const {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes (used by official website & HRMS)
router.get('/', getAllJobs);
router.get('/:id', getJobById);

// Protected routes (HRMS admin, hr, manager, superadmin)
router.post('/', protect, authorize('superadmin', 'admin', 'hr', 'manager'), createJob);
router.put('/:id', protect, authorize('superadmin', 'admin', 'hr', 'manager'), updateJob);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'hr'), deleteJob);

module.exports = router;
