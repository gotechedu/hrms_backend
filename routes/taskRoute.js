const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getTasks);
router.get('/:id', protect, getTaskById);
router.post('/', protect, createTask);
router.put('/:id', protect, updateTask);
router.patch('/:id/status', protect, updateTaskStatus);
router.delete('/:id', protect, deleteTask);

module.exports = router;
