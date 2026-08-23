const express = require('express');
const router = express.Router();
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes (used by official website & HRMS)
router.get('/', getAllCourses);
router.get('/:id', getCourseById);

// Protected routes (HRMS admin, hr, manager, superadmin)
router.post('/', protect, authorize('superadmin', 'admin', 'hr', 'manager'), createCourse);
router.put('/:id', protect, authorize('superadmin', 'admin', 'hr', 'manager'), updateCourse);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'hr'), deleteCourse);

module.exports = router;
