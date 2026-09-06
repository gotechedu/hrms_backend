const express = require('express');
const router = express.Router();
const {
  getGrievances,
  getGrievanceById,
  fileGrievance,
  updateGrievanceArbitration,
  deleteGrievance,
} = require('../controllers/grievanceController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

router.get('/', optionalProtect, getGrievances);
router.post('/', optionalProtect, fileGrievance);
router.get('/:id', optionalProtect, getGrievanceById);
router.put('/:id/arbitrate', protect, updateGrievanceArbitration);
router.delete('/:id', protect, deleteGrievance);

module.exports = router;
