const express = require('express');
const router = express.Router();
const {
  submitCourseApplication,
  getCourseApplicationById,
  getAllCourseApplications,
  updateCourseApplicationStatus,
  deleteCourseApplication,
} = require('../controllers/courseApplicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

const {
  createPaymentOrder,
  verifyPaymentSignature,
} = require('../controllers/paymentController');

// Public route - students apply & pay from official website
router.post('/', submitCourseApplication);
router.post('/create-order', createPaymentOrder);
router.post('/verify-payment', verifyPaymentSignature);

// Protected routes - HRMS staff reviews applications
router.get('/', protect, authorize('superadmin', 'admin', 'hr', 'manager'), getAllCourseApplications);
router.get('/:id', protect, authorize('superadmin', 'admin', 'hr', 'manager'), getCourseApplicationById);
router.put('/:id', protect, authorize('superadmin', 'admin', 'hr', 'manager'), updateCourseApplicationStatus);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'hr'), deleteCourseApplication);

module.exports = router;
