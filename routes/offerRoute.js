const express = require('express');
const router = express.Router();
const {
  createOffer,
  getAllOffers,
  getPortalPopupOffer,
  updateOffer,
  deleteOffer,
  validateCoupon,
} = require('../controllers/offerController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');
const { formSubmitLimiter } = require('../middleware/securityMiddleware');
const { validateCouponInput } = require('../middleware/validatorMiddleware');

// Public routes for website frontend & checkout
router.get('/portal-popup', getPortalPopupOffer);
router.post('/validate', formSubmitLimiter, validateCouponInput, validateCoupon);

// HRMS Management routes
router.get('/', protect, checkAnyPermission('view_learninghub', 'manage_learninghub', 'manage_career', 'view_career', 'manage_settings'), getAllOffers);
router.post('/', protect, checkAnyPermission('manage_learninghub', 'manage_career', 'manage_settings'), createOffer);
router.put('/:id', protect, checkAnyPermission('manage_learninghub', 'manage_career', 'manage_settings'), updateOffer);
router.delete('/:id', protect, checkAnyPermission('manage_learninghub', 'manage_career', 'manage_settings'), deleteOffer);

module.exports = router;
