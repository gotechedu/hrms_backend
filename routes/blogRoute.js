const express = require('express');
const router = express.Router();
const {
  getAllBlogs,
  getBlogBySlugOrId,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blogController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes (used by official website & HRMS)
router.get('/', getAllBlogs);
router.get('/:slugOrId', getBlogBySlugOrId);

// Protected routes (HRMS admin, hr, manager, superadmin)
router.post('/', protect, authorize('superadmin', 'admin', 'hr', 'manager'), createBlog);
router.put('/:id', protect, authorize('superadmin', 'admin', 'hr', 'manager'), updateBlog);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'hr'), deleteBlog);

module.exports = router;
