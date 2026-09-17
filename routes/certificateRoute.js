const express = require('express');
const router = express.Router();
const {
  getAllCertificates,
  issueCertificate,
  verifyCertificatePublic,
} = require('../controllers/certificateController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

// Public verification
router.get('/verify/:code', verifyCertificatePublic);

// Authenticated trainee and admin routes
router.get('/', protect, getAllCertificates);
router.post('/issue', protect, checkAnyPermission('issue_certificates', 'manage_learninghub'), issueCertificate);

module.exports = router;
