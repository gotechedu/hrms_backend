const express = require('express');
const router = express.Router();
const {
  createAndSendQuotation,
  getQuotationsByInquiry,
  getAllQuotations,
  getPublicQuotation,
  submitQuotationRegistration,
  verifyQuotation,
} = require('../controllers/quotationController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');
const { formSubmitLimiter } = require('../middleware/securityMiddleware');

// Public endpoints - client views quotation & submits registration with payment reference
router.get('/public/:id', getPublicQuotation);
router.post('/public/:id/register', formSubmitLimiter, submitQuotationRegistration);

// Protected endpoints - HRMS staff access
router.post(
  '/send',
  protect,
  checkAnyPermission('manage_contacts', 'manage_contact', 'manage_learninghub'),
  createAndSendQuotation
);

router.get(
  '/',
  protect,
  checkAnyPermission('view_contacts', 'manage_contacts', 'manage_contact', 'view_learninghub'),
  getAllQuotations
);

router.get(
  '/inquiry/:inquiryId',
  protect,
  checkAnyPermission('view_contacts', 'manage_contacts', 'manage_contact', 'view_learninghub'),
  getQuotationsByInquiry
);

router.post(
  '/:id/verify',
  protect,
  checkAnyPermission('manage_contacts', 'manage_contact', 'manage_learninghub'),
  verifyQuotation
);

module.exports = router;
