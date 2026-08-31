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
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes for website frontend & checkout
router.get('/portal-popup', getPortalPopupOffer);
router.post('/validate', validateCoupon);

// HRMS Management routes
router.get('/', protect, authorize('superadmin', 'admin', 'hr', 'manager'), getAllOffers);
router.post('/', protect, authorize('superadmin', 'admin', 'hr'), createOffer);
router.put('/:id', protect, authorize('superadmin', 'admin', 'hr'), updateOffer);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteOffer);

module.exports = router;
