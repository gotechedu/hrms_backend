const express = require('express');
const router = express.Router();
const {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} = require('../controllers/holidayController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getHolidays);
router.post('/', protect, createHoliday);
router.put('/:id', protect, updateHoliday);
router.delete('/:id', protect, deleteHoliday);

module.exports = router;
