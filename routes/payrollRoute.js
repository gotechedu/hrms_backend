const express = require('express');
const router = express.Router();
const {
  getPayrolls,
  getPayrollStats,
  getPayrollById,
  createPayroll,
  updatePayroll,
  updatePaymentStatus,
  deletePayroll,
} = require('../controllers/payrollController');

const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

// All payroll routes require authentication and payroll permission
router.use(protect);

router.get('/', checkAnyPermission('view_payroll', 'manage_payroll'), getPayrolls);
router.get('/stats', checkAnyPermission('view_payroll', 'manage_payroll'), getPayrollStats);
router.get('/:id', checkAnyPermission('view_payroll', 'manage_payroll'), getPayrollById);
router.post('/', checkAnyPermission('manage_payroll'), createPayroll);
router.put('/:id', checkAnyPermission('manage_payroll'), updatePayroll);
router.patch('/:id/status', checkAnyPermission('manage_payroll'), updatePaymentStatus);
router.delete('/:id', checkAnyPermission('manage_payroll'), deletePayroll);

module.exports = router;
