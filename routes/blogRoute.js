const express = require('express');
const router = express.Router();
const {
  getAllBlogs,
  getBlogBySlugOrId,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blogController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

// Public routes (used by official website & HRMS)
router.get('/', getAllBlogs);
router.get('/:slugOrId', getBlogBySlugOrId);

// Protected routes (Roles with manage_blogs permission)
router.post('/', protect, checkAnyPermission('manage_blogs'), createBlog);
router.put('/:id', protect, checkAnyPermission('manage_blogs'), updateBlog);
router.delete('/:id', protect, checkAnyPermission('manage_blogs'), deleteBlog);

module.exports = router;
