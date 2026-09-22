const express = require('express');
const router = express.Router();
const {
  createPaymentOrder,
  verifyPaymentSignature,
} = require('../controllers/paymentController');
const { formSubmitLimiter } = require('../middleware/securityMiddleware');
const {
  validatePaymentOrderInput,
  validatePaymentVerifyInput,
} = require('../middleware/validatorMiddleware');

// POST /api/payments/create-order
router.post('/create-order', formSubmitLimiter, validatePaymentOrderInput, createPaymentOrder);

// POST /api/payments/verify-payment
router.post('/verify-payment', formSubmitLimiter, validatePaymentVerifyInput, verifyPaymentSignature);

module.exports = router;
