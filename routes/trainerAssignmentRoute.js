const express = require('express');
const router = express.Router();
const {
  getAllTrainers,
  getAllAssignments,
  createTrainerAssignment,
  removeTrainerAssignment,
  getTrainerDashboardStats,
} = require('../controllers/trainerAssignmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/trainers', protect, authorize('superadmin', 'admin', 'trainer', 'hr'), getAllTrainers);
router.get('/', protect, authorize('superadmin', 'admin', 'trainer'), getAllAssignments);
router.post('/', protect, authorize('superadmin', 'admin'), createTrainerAssignment);
router.delete('/:id', protect, authorize('superadmin', 'admin'), removeTrainerAssignment);
router.get('/trainer-dashboard-stats', protect, authorize('superadmin', 'admin', 'trainer'), getTrainerDashboardStats);

module.exports = router;
