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
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route - official website visitors submit contact consultation inquiries
router.post('/', submitContactInquiry);

// Protected routes - HRMS staff access
router.get('/stats', protect, authorize('superadmin', 'admin', 'hr', 'manager'), getContactStats);
router.get('/', protect, authorize('superadmin', 'admin', 'hr', 'manager'), getAllContactInquiries);
router.post('/manual', protect, authorize('superadmin', 'admin', 'hr', 'manager'), createManualInquiry);
router.get('/:id', protect, authorize('superadmin', 'admin', 'hr', 'manager'), getContactInquiryById);
router.put('/:id', protect, authorize('superadmin', 'admin', 'hr', 'manager'), updateContactInquiry);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'hr'), deleteContactInquiry);

module.exports = router;
