const express = require('express');
const router = express.Router();
const {
  getAllClasses,
  createClass,
  updateClass,
  deleteClass,
} = require('../controllers/classController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/', protect, getAllClasses);
router.post('/', protect, checkAnyPermission('manage_classes', 'manage_learninghub'), createClass);
router.put('/:id', protect, checkAnyPermission('manage_classes', 'manage_learninghub'), updateClass);
router.delete('/:id', protect, checkAnyPermission('manage_classes', 'manage_learninghub'), deleteClass);

module.exports = router;
