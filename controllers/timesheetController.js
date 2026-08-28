const { Timesheet } = require('../models/Timesheet');

/**
 * Helper to calculate total hours from daily breakdown
 */
const computeTotalHours = (daily = {}) => {
  return (
    Number(daily.mon || 0) +
    Number(daily.tue || 0) +
    Number(daily.wed || 0) +
    Number(daily.thu || 0) +
    Number(daily.fri || 0) +
    Number(daily.sat || 0) +
    Number(daily.sun || 0)
  );
};

/**
 * POST /api/timesheets
 * Create or submit new timesheet entry
 */
const createTimesheet = async (req, res) => {
  try {
    const {
      weekStartDate,
      project,
      client,
      taskCategory,
      dailyHours,
      billableHours,
      description,
      status,
    } = req.body;

    if (!weekStartDate || !project) {
      return res.status(400).json({
        success: false,
        message: 'Week start date and project name are required',
      });
    }

    const totalHours = computeTotalHours(dailyHours);

    const timesheet = await Timesheet.create({
      user: req.user._id,
      employee: req.user.employeeProfile?._id || req.user.employeeProfile || null,
      weekStartDate,
      project: project.trim(),
      client: client?.trim() || 'Internal GoTechEdu',
      taskCategory: taskCategory || 'Development',
      dailyHours: dailyHours || { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
      totalHours,
      billableHours: billableHours !== undefined ? Number(billableHours) : totalHours,
      description: description || '',
      status: status || 'Submitted',
    });

    return res.status(201).json({
      success: true,
      message: 'Timesheet logged successfully',
      timesheet,
    });
  } catch (error) {
    console.error('Create Timesheet Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create timesheet entry',
      error: error.message,
    });
  }
};

/**
 * GET /api/timesheets/my
 * Get logged-in user's personal timesheet history
 */
const getMyTimesheets = async (req, res) => {
  try {
    const timesheets = await Timesheet.find({ user: req.user._id })
      .sort({ weekStartDate: -1, createdAt: -1 })
      .populate('reviewedBy', 'name email');

    return res.status(200).json({
      success: true,
      count: timesheets.length,
      timesheets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personal timesheets',
      error: error.message,
    });
  }
};

/**
 * GET /api/timesheets
 * Manager / HR / Admin overview: Get all organizational timesheet logs
 */
const getAllTimesheets = async (req, res) => {
  try {
    const { status, project, week } = req.query;
    const filter = {};

    if (status && status !== 'All') filter.status = status;
    if (project && project !== 'All') filter.project = project;
    if (week && week !== 'All') filter.weekStartDate = week;

    const timesheets = await Timesheet.find(filter)
      .populate('user', 'name email role')
      .populate('employee', 'name employeeId department designation avatar')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    const totalLoggedHours = timesheets.reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const totalBillableHours = timesheets.reduce((sum, t) => sum + (t.billableHours || 0), 0);
    const pendingApprovals = timesheets.filter((t) => t.status === 'Submitted').length;

    return res.status(200).json({
      success: true,
      count: timesheets.length,
      metrics: {
        totalLoggedHours,
        totalBillableHours,
        pendingApprovals,
      },
      timesheets,
    });
  } catch (error) {
    console.error('Get All Timesheets Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch organization timesheets',
      error: error.message,
    });
  }
};

/**
 * PUT /api/timesheets/:id
 * Update personal timesheet entry
 */
const updateTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      project,
      client,
      taskCategory,
      dailyHours,
      billableHours,
      description,
      status,
    } = req.body;

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found' });
    }

    if (timesheet.user.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this timesheet' });
    }

    if (project) timesheet.project = project.trim();
    if (client) timesheet.client = client.trim();
    if (taskCategory) timesheet.taskCategory = taskCategory;
    if (dailyHours) {
      timesheet.dailyHours = dailyHours;
      timesheet.totalHours = computeTotalHours(dailyHours);
    }
    if (billableHours !== undefined) timesheet.billableHours = Number(billableHours);
    if (description !== undefined) timesheet.description = description;
    if (status) timesheet.status = status;

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: 'Timesheet updated successfully',
      timesheet,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update timesheet',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/timesheets/:id
 * Delete timesheet entry
 */
const deleteTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const timesheet = await Timesheet.findById(id);

    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found' });
    }

    if (timesheet.user.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this timesheet' });
    }

    await Timesheet.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Timesheet entry deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete timesheet',
      error: error.message,
    });
  }
};

/**
 * PUT /api/timesheets/:id/status
 * Approve or Reject timesheet (Managers, HR, Admin)
 */
const updateTimesheetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!['Approved', 'Rejected', 'Submitted', 'Draft'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found' });
    }

    timesheet.status = status;
    timesheet.reviewedBy = req.user._id;
    if (remarks) timesheet.reviewRemarks = remarks;

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: `Timesheet marked as ${status}`,
      timesheet,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update approval status',
      error: error.message,
    });
  }
};

module.exports = {
  createTimesheet,
  getMyTimesheets,
  getAllTimesheets,
  updateTimesheet,
  deleteTimesheet,
  updateTimesheetStatus,
};
