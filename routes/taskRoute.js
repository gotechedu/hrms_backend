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
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/', protect, checkAnyPermission('view_task', 'manage_task'), getTasks);
router.get('/:id', protect, checkAnyPermission('view_task', 'manage_task'), getTaskById);
router.post('/', protect, checkAnyPermission('add_task', 'create_task', 'manage_task'), createTask);
router.put('/:id', protect, checkAnyPermission('update_task', 'edit_task', 'manage_task'), updateTask);
router.patch('/:id/status', protect, checkAnyPermission('update_task', 'edit_task', 'manage_task'), updateTaskStatus);
router.delete('/:id', protect, checkAnyPermission('delete_task', 'manage_task'), deleteTask);

module.exports = router;
