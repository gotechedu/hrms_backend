const express = require('express');
const router = express.Router();
const {
  getAllCertificates,
  issueCertificate,
  verifyCertificatePublic,
} = require('../controllers/certificateController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public verification
router.get('/verify/:code', verifyCertificatePublic);

// Authenticated trainee and admin routes
router.get('/', protect, getAllCertificates);
router.post('/issue', protect, authorize('superadmin', 'admin'), issueCertificate);

module.exports = router;
