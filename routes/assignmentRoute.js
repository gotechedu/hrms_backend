const express = require('express');
const router = express.Router();
const {
  getAllAssignments,
  createAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
} = require('../controllers/assignmentController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/', protect, getAllAssignments);
router.post('/', protect, checkAnyPermission('manage_assignments', 'manage_learninghub'), createAssignment);
router.post('/:id/submit', protect, submitAssignment);
router.get('/:id/submissions', protect, checkAnyPermission('manage_assignments', 'grade_submissions', 'manage_learninghub'), getAssignmentSubmissions);
router.post('/submissions/:submissionId/grade', protect, checkAnyPermission('grade_submissions', 'manage_assignments', 'manage_learninghub'), gradeSubmission);

module.exports = router;
