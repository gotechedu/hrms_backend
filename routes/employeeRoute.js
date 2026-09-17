const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
  getDepartmentsList,
} = require('../controllers/employeeController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

// All employee routes require authentication
router.use(protect);

// Specific helper endpoints (placed above :id to prevent parameter clash)
router.get('/stats', checkAnyPermission('view_employee', 'manage_employee'), getEmployeeStats);
router.get('/departments', getDepartmentsList);

// Main CRUD endpoints
router.route('/')
  .get(checkAnyPermission('view_employee', 'manage_employee'), getAllEmployees)
  .post(checkAnyPermission('create_employee', 'manage_employee'), createEmployee);

router.route('/:id')
  .get(checkAnyPermission('view_employee', 'manage_employee'), getEmployeeById)
  .put(checkAnyPermission('update_employee', 'edit_employee', 'manage_employee'), updateEmployee)
  .delete(checkAnyPermission('delete_employee', 'manage_employee'), deleteEmployee);

module.exports = router;
