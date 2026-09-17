const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  updateProjectProgress,
  deleteProject,
} = require('../controllers/projectController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/', protect, checkAnyPermission('view_project', 'manage_project'), getProjects);
router.get('/:id', protect, checkAnyPermission('view_project', 'manage_project'), getProjectById);
router.post('/', protect, checkAnyPermission('create_project', 'add_project', 'manage_project'), createProject);
router.put('/:id', protect, checkAnyPermission('update_project', 'edit_project', 'manage_project'), updateProject);
router.patch('/:id/progress', protect, checkAnyPermission('update_project', 'edit_project', 'manage_project'), updateProjectProgress);
router.delete('/:id', protect, checkAnyPermission('delete_project', 'manage_project'), deleteProject);

module.exports = router;
