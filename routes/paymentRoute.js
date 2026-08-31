const express = require('express');
const router = express.Router();
const {
  createPaymentOrder,
  verifyPaymentSignature,
} = require('../controllers/paymentController');

// POST /api/payments/create-order
router.post('/create-order', createPaymentOrder);

// POST /api/payments/verify-payment
router.post('/verify-payment', verifyPaymentSignature);

module.exports = router;
