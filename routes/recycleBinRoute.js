const express = require('express');
const router = express.Router();
const {
  getDeletedItems,
  restoreItem,
  permanentDeleteItem,
  emptyRecycleBin,
} = require('../controllers/recycleBinController');

router.get('/', getDeletedItems);
router.post('/restore/:type/:id', restoreItem);
router.delete('/permanent/:type/:id', permanentDeleteItem);
router.delete('/empty', emptyRecycleBin);

module.exports = router;
