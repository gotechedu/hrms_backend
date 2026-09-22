const express = require('express');
const router = express.Router();
const {
  submitContactInquiry,
  getAllContactInquiries,
  getContactStats,
  getContactInquiryById,
  updateContactInquiry,
  createManualInquiry,
  deleteContactInquiry,
} = require('../controllers/contactController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');
const { formSubmitLimiter } = require('../middleware/securityMiddleware');
const { validateContactInquiryInput } = require('../middleware/validatorMiddleware');

// Public route - official website visitors submit contact consultation inquiries
router.post('/', formSubmitLimiter, validateContactInquiryInput, submitContactInquiry);

// Protected routes - HRMS staff access
router.get('/stats', protect, checkAnyPermission('view_contacts', 'manage_contacts', 'manage_contact'), getContactStats);
router.get('/', protect, checkAnyPermission('view_contacts', 'manage_contacts', 'manage_contact'), getAllContactInquiries);
router.post('/manual', protect, checkAnyPermission('manage_contacts', 'manage_contact'), createManualInquiry);
router.get('/:id', protect, checkAnyPermission('view_contacts', 'manage_contacts', 'manage_contact'), getContactInquiryById);
router.put('/:id', protect, checkAnyPermission('manage_contacts', 'manage_contact'), updateContactInquiry);
router.delete('/:id', protect, checkAnyPermission('manage_contacts', 'manage_contact'), deleteContactInquiry);

module.exports = router;
