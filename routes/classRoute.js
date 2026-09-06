const express = require('express');
const router = express.Router();
const {
  getAllClasses,
  createClass,
  updateClass,
  deleteClass,
} = require('../controllers/classController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getAllClasses);
router.post('/', protect, authorize('superadmin', 'admin', 'trainer'), createClass);
router.put('/:id', protect, authorize('superadmin', 'admin', 'trainer'), updateClass);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'trainer'), deleteClass);

module.exports = router;
