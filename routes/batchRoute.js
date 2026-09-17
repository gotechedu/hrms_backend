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
const { protect, checkAnyPermission, optionalProtect } = require('../middleware/authMiddleware');

// Public/Optional route for course cohort browsing (e.g. on public course detail)
router.get('/', optionalProtect, getAllBatches);
router.get('/:id', optionalProtect, getBatchById);

// Protected routes (Roles with batch management or learninghub permissions)
router.post('/', protect, checkAnyPermission('manage_batches', 'manage_learninghub'), createBatch);
router.put('/:id', protect, checkAnyPermission('manage_batches', 'manage_learninghub'), updateBatch);
router.delete('/:id', protect, checkAnyPermission('manage_batches', 'manage_learninghub'), deleteBatch);
router.get('/:id/trainees', protect, checkAnyPermission('manage_batches', 'manage_learninghub', 'view_learninghub'), getBatchTrainees);

module.exports = router;
