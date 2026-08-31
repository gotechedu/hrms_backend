const { Holiday } = require('../models/Holiday');

// Seed default holidays if DB is empty so system always has valid records
const defaultHolidays = [
  { name: 'New Year Day', date: '2025-01-01', day: 'Wednesday', type: 'Public Holiday', isOptional: false },
  { name: 'Republic Day', date: '2025-01-26', day: 'Sunday', type: 'National Holiday', isOptional: false },
  { name: 'Maha Shivratri', date: '2025-02-26', day: 'Wednesday', type: 'Restricted Holiday', isOptional: true },
  { name: 'Holi (Festival of Colors)', date: '2025-03-14', day: 'Friday', type: 'Public Holiday', isOptional: false },
  { name: 'Eid-ul-Fitr', date: '2025-03-31', day: 'Monday', type: 'Public Holiday', isOptional: false },
  { name: 'Good Friday', date: '2025-04-18', day: 'Friday', type: 'Public Holiday', isOptional: false },
  { name: 'Independence Day', date: '2025-08-15', day: 'Friday', type: 'National Holiday', isOptional: false },
  { name: 'Gandhi Jayanti', date: '2025-10-02', day: 'Thursday', type: 'National Holiday', isOptional: false },
  { name: 'Dussehra (Vijayadashami)', date: '2025-10-02', day: 'Thursday', type: 'Public Holiday', isOptional: false },
  { name: 'Diwali (Deepavali)', date: '2025-10-20', day: 'Monday', type: 'Public Holiday', isOptional: false },
  { name: 'Guru Nanak Jayanti', date: '2025-11-05', day: 'Wednesday', type: 'Public Holiday', isOptional: false },
  { name: 'Christmas Day', date: '2025-12-25', day: 'Thursday', type: 'Public Holiday', isOptional: false },
];

/**
 * @desc    Get all holidays with optional filtering by year, type, search
 * @route   GET /api/holidays
 * @access  Private / Public
 */
const getHolidays = async (req, res) => {
  try {
    const { year, type, search } = req.query;
    let query = {};

    if (year) {
      query.date = { $regex: `^${year}` };
    }
    if (type && type !== 'All') {
      query.type = type;
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let holidays = await Holiday.find(query).sort({ date: 1 });

    // Seed defaults if empty
    if (holidays.length === 0 && (!year || year === '2025') && !search && (!type || type === 'All')) {
      const count = await Holiday.countDocuments();
      if (count === 0) {
        await Holiday.insertMany(defaultHolidays);
        holidays = await Holiday.find().sort({ date: 1 });
      }
    }

    res.status(200).json({
      success: true,
      count: holidays.length,
      data: holidays,
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Create a new holiday
 * @route   POST /api/holidays
 * @access  Private (Admin / HR)
 */
const createHoliday = async (req, res) => {
  try {
    const { name, date, day, type, isOptional, description } = req.body;

    if (!name || !date || !day) {
      return res.status(400).json({ success: false, message: 'Name, date, and day are required' });
    }

    const year = date.split('-')[0] || '2025';

    const holiday = await Holiday.create({
      name,
      date,
      day,
      type: type || 'Public Holiday',
      year,
      isOptional: Boolean(isOptional),
      description: description || '',
      createdBy: req.user ? req.user._id : null,
    });

    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: holiday,
    });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Update holiday
 * @route   PUT /api/holidays/:id
 * @access  Private (Admin / HR)
 */
const updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    if (req.body.date) {
      req.body.year = req.body.date.split('-')[0] || holiday.year;
    }

    const updated = await Holiday.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Delete holiday
 * @route   DELETE /api/holidays/:id
 * @access  Private (Admin / HR)
 */
const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    await holiday.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Holiday removed successfully',
      id: req.params.id,
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
};
