const express = require('express');
const router = express.Router();
const {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  acknowledgePolicy,
} = require('../controllers/policyController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

router.get('/', optionalProtect, getPolicies);
router.get('/:id', optionalProtect, getPolicyById);
router.post('/', protect, createPolicy);
router.put('/:id', protect, updatePolicy);
router.delete('/:id', protect, deletePolicy);
router.post('/:id/acknowledge', optionalProtect, acknowledgePolicy);

module.exports = router;
