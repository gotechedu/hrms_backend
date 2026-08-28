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

// Routes
router.get('/', getPayrolls);
router.get('/stats', getPayrollStats);
router.get('/:id', getPayrollById);
router.post('/', createPayroll);
router.put('/:id', updatePayroll);
router.patch('/:id/status', updatePaymentStatus);
router.delete('/:id', deletePayroll);

module.exports = router;
