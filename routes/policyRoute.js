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
const { protect, optionalProtect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/', optionalProtect, getPolicies);
router.get('/:id', optionalProtect, getPolicyById);
router.post('/', protect, checkAnyPermission('manage_policy'), createPolicy);
router.put('/:id', protect, checkAnyPermission('manage_policy'), updatePolicy);
router.delete('/:id', protect, checkAnyPermission('manage_policy'), deletePolicy);
router.post('/:id/acknowledge', optionalProtect, acknowledgePolicy);

module.exports = router;
