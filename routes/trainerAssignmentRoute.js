const express = require('express');
const router = express.Router();
const {
  getAllTrainers,
  getAllAssignments,
  createTrainerAssignment,
  removeTrainerAssignment,
  getTrainerDashboardStats,
} = require('../controllers/trainerAssignmentController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/trainers', protect, checkAnyPermission('manage_trainers', 'manage_learninghub', 'view_learninghub'), getAllTrainers);
router.get('/', protect, checkAnyPermission('manage_trainers', 'manage_learninghub', 'view_learninghub'), getAllAssignments);
router.post('/', protect, checkAnyPermission('manage_trainers', 'manage_learninghub'), createTrainerAssignment);
router.delete('/:id', protect, checkAnyPermission('manage_trainers', 'manage_learninghub'), removeTrainerAssignment);
router.get('/trainer-dashboard-stats', protect, checkAnyPermission('manage_trainers', 'manage_learninghub', 'view_learninghub'), getTrainerDashboardStats);

module.exports = router;
