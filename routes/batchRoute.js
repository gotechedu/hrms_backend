const express = require('express');
const router = express.Router();
const {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchTrainees,
} = require('../controllers/batchController');
const { protect, authorize, optionalProtect } = require('../middleware/authMiddleware');

// Public/Optional route for course cohort browsing (e.g. on public course detail)
router.get('/', optionalProtect, getAllBatches);
router.get('/:id', optionalProtect, getBatchById);

// Protected routes (Admin, Trainer)
router.post('/', protect, authorize('superadmin', 'admin', 'trainer'), createBatch);
router.put('/:id', protect, authorize('superadmin', 'admin', 'trainer'), updateBatch);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteBatch);
router.get('/:id/trainees', protect, authorize('superadmin', 'admin', 'trainer'), getBatchTrainees);

module.exports = router;
