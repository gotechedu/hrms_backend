const express = require('express');
const router = express.Router();
const {
  getAllAssessments,
  getAssessmentById,
  createAssessment,
  submitAssessmentAttempt,
} = require('../controllers/assessmentController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/', protect, getAllAssessments);
router.get('/:id', protect, getAssessmentById);
router.post('/', protect, checkAnyPermission('manage_assessments', 'manage_learninghub'), createAssessment);
router.post('/:id/submit', protect, submitAssessmentAttempt);

module.exports = router;
