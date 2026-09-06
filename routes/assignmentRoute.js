const express = require('express');
const router = express.Router();
const {
  getAllAssignments,
  createAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
} = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getAllAssignments);
router.post('/', protect, authorize('superadmin', 'admin', 'trainer'), createAssignment);
router.post('/:id/submit', protect, submitAssignment);
router.get('/:id/submissions', protect, authorize('superadmin', 'admin', 'trainer'), getAssignmentSubmissions);
router.post('/submissions/:submissionId/grade', protect, authorize('superadmin', 'admin', 'trainer'), gradeSubmission);

module.exports = router;
