const express = require('express');
const router = express.Router();
const {
  getAllEnrollments,
  getMyEnrollments,
  getCoursePlayer,
  markLessonComplete,
} = require('../controllers/enrollmentController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

// Trainee routes
router.get('/my-enrollments', protect, getMyEnrollments);
router.get('/:id/learning-path', protect, getCoursePlayer);
router.post('/:id/lessons/:lessonId/complete', protect, markLessonComplete);

// Management route (Admin, HR, Trainer, or roles with view_learninghub / manage_learninghub permission)
router.get('/', protect, checkAnyPermission('view_learninghub', 'manage_learninghub'), getAllEnrollments);

module.exports = router;
