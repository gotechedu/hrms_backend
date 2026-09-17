const express = require('express');
const router = express.Router();
const {
  getDeletedItems,
  restoreItem,
  permanentDeleteItem,
  emptyRecycleBin,
} = require('../controllers/recycleBinController');

const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', checkAnyPermission('view_recycle_bin', 'manage_recycle_bin', 'recycle_bin'), getDeletedItems);
router.post('/restore/:type/:id', checkAnyPermission('manage_recycle_bin', 'recycle_bin'), restoreItem);
router.delete('/permanent/:type/:id', checkAnyPermission('manage_recycle_bin', 'recycle_bin'), permanentDeleteItem);
router.delete('/empty', checkAnyPermission('manage_recycle_bin', 'recycle_bin'), emptyRecycleBin);

module.exports = router;
