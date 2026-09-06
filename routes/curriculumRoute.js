const express = require('express');
const router = express.Router();
const {
  getCourseCurriculum,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  getLessonPublicPreview,
} = require('../controllers/curriculumController');
const { protect, authorize, optionalProtect } = require('../middleware/authMiddleware');

// Public routes for curriculum browsing and free preview
router.get('/course/:courseId', optionalProtect, getCourseCurriculum);
router.get('/lessons/:lessonId/preview', getLessonPublicPreview);

// Protected authoring routes (Superadmin, Admin, Trainer)
router.post('/modules', protect, authorize('superadmin', 'admin', 'trainer'), createModule);
router.put('/modules/:moduleId', protect, authorize('superadmin', 'admin', 'trainer'), updateModule);
router.delete('/modules/:moduleId', protect, authorize('superadmin', 'admin'), deleteModule);
router.post('/modules/reorder', protect, authorize('superadmin', 'admin', 'trainer'), reorderModules);

router.post('/lessons', protect, authorize('superadmin', 'admin', 'trainer'), createLesson);
router.put('/lessons/:lessonId', protect, authorize('superadmin', 'admin', 'trainer'), updateLesson);
router.delete('/lessons/:lessonId', protect, authorize('superadmin', 'admin', 'trainer'), deleteLesson);
router.post('/lessons/reorder', protect, authorize('superadmin', 'admin', 'trainer'), reorderLessons);

module.exports = router;
