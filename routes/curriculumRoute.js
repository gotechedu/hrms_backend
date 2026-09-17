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
const { protect, checkAnyPermission, optionalProtect } = require('../middleware/authMiddleware');

// Public routes for curriculum browsing and free preview
router.get('/course/:courseId', optionalProtect, getCourseCurriculum);
router.get('/lessons/:lessonId/preview', getLessonPublicPreview);

// Protected authoring routes (Roles with learninghub management permissions)
router.post('/modules', protect, checkAnyPermission('manage_learninghub'), createModule);
router.put('/modules/:moduleId', protect, checkAnyPermission('manage_learninghub'), updateModule);
router.delete('/modules/:moduleId', protect, checkAnyPermission('manage_learninghub'), deleteModule);
router.post('/modules/reorder', protect, checkAnyPermission('manage_learninghub'), reorderModules);

router.post('/lessons', protect, checkAnyPermission('manage_learninghub'), createLesson);
router.put('/lessons/:lessonId', protect, checkAnyPermission('manage_learninghub'), updateLesson);
router.delete('/lessons/:lessonId', protect, checkAnyPermission('manage_learninghub'), deleteLesson);
router.post('/lessons/reorder', protect, checkAnyPermission('manage_learninghub'), reorderLessons);

module.exports = router;
