const express = require('express');
const router = express.Router();
const {
  getAllEnrollments,
  getMyEnrollments,
  getCoursePlayer,
  markLessonComplete,
} = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Trainee routes
router.get('/my-enrollments', protect, getMyEnrollments);
router.get('/:id/learning-path', protect, getCoursePlayer);
router.post('/:id/lessons/:lessonId/complete', protect, markLessonComplete);

// Admin / Trainer management route
router.get('/', protect, authorize('superadmin', 'admin', 'trainer', 'hr'), getAllEnrollments);

module.exports = router;
