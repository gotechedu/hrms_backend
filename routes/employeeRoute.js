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
const { protect, authorize } = require('../middleware/authMiddleware');

// All employee routes require authentication
router.use(protect);

// Specific helper endpoints (placed above :id to prevent parameter clash)
router.get('/stats', authorize('admin', 'hr', 'manager'), getEmployeeStats);
router.get('/departments', getDepartmentsList);

// Main CRUD endpoints
router.route('/')
  .get(getAllEmployees)
  .post(authorize('admin', 'hr'), createEmployee);

router.route('/:id')
  .get(getEmployeeById)
  .put(authorize('admin', 'hr', 'manager'), updateEmployee)
  .delete(authorize('admin', 'hr'), deleteEmployee);

module.exports = router;
