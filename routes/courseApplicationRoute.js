const express = require('express');
const router = express.Router();
const {
  submitCourseApplication,
  getCourseApplicationById,
  getAllCourseApplications,
  updateCourseApplicationStatus,
  deleteCourseApplication,
} = require('../controllers/courseApplicationController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

const {
  createPaymentOrder,
  verifyPaymentSignature,
} = require('../controllers/paymentController');

// Public route - students apply & pay from official website
router.post('/', submitCourseApplication);
router.post('/create-order', createPaymentOrder);
router.post('/verify-payment', verifyPaymentSignature);

// Protected routes - HRMS staff reviews applications
router.get('/', protect, checkAnyPermission('view_learninghub', 'manage_learninghub', 'manage_applications', 'manage_career'), getAllCourseApplications);
router.get('/:id', protect, checkAnyPermission('view_learninghub', 'manage_learninghub', 'manage_applications', 'manage_career'), getCourseApplicationById);
router.put('/:id', protect, checkAnyPermission('manage_learninghub', 'manage_applications', 'manage_career'), updateCourseApplicationStatus);
router.delete('/:id', protect, checkAnyPermission('manage_learninghub', 'manage_applications', 'manage_career'), deleteCourseApplication);

module.exports = router;
