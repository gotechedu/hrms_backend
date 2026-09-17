const express = require('express');
const router = express.Router();
const {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} = require('../controllers/holidayController');
const { protect, checkAnyPermission } = require('../middleware/authMiddleware');

router.get('/', getHolidays);
router.post('/', protect, checkAnyPermission('add_holiday', 'manage_holiday'), createHoliday);
router.put('/:id', protect, checkAnyPermission('add_holiday', 'manage_holiday'), updateHoliday);
router.delete('/:id', protect, checkAnyPermission('manage_holiday'), deleteHoliday);

module.exports = router;
