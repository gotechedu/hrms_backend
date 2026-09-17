const { Attendance, LeaveRequest } = require('../models/Attendance');
const { Employee } = require('../models/Employee');
const { User } = require('../models/User');

/**
 * Helper to get current Date in YYYY-MM-DD format (local/IST safe)
 */
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper to extract client IP address
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  let ip = req.socket.remoteAddress || req.ip || '127.0.0.1';
  if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
  return ip;
};

/**
 * POST /api/attendance/clock-in
 * Employee Clock-In Punch
 */
const clockIn = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getTodayDateString();
    const now = new Date();
    const ipAddress = getClientIp(req);

    // Check if employee already punched in today
    let record = await Attendance.findOne({ user: userId, date: today });
    if (record && record.clockIn) {
      const formattedTime = new Date(record.clockIn).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return res.status(400).json({
        success: false,
        message: `You have already clocked in today at ${formattedTime}`,
        record,
      });
    }

    // Determine status: Late if after 09:30 AM (local hour 9 and min > 30)
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);
    const status = isLate ? 'Late' : 'Present';

    record = await Attendance.create({
      user: userId,
      employee: req.user.employeeProfile?._id || req.user.employeeProfile || null,
      date: today,
      clockIn: now,
      clockOut: null,
      totalMinutes: 0,
      totalHours: '0h 0m',
      ipAddress,
      status,
      mode: 'Web System Punch',
    });

    return res.status(201).json({
      success: true,
      message: `Clock-in successful at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`,
      record,
    });
  } catch (error) {
    console.error('Clock-in Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record clock-in',
      error: error.message,
    });
  }
};

/**
 * POST /api/attendance/clock-out
 * Employee Clock-Out Punch & Duration Computation
 */
const clockOut = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getTodayDateString();
    const now = new Date();

    const record = await Attendance.findOne({ user: userId, date: today });

    if (!record || !record.clockIn) {
      return res.status(400).json({
        success: false,
        message: 'No clock-in session found for today. Please clock in first.',
      });
    }

    if (record.clockOut) {
      const formattedTime = new Date(record.clockOut).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return res.status(400).json({
        success: false,
        message: `You have already clocked out today at ${formattedTime}`,
        record,
      });
    }

    // Calculate duration
    const clockInTime = new Date(record.clockIn).getTime();
    const clockOutTime = now.getTime();
    const diffMs = Math.max(0, clockOutTime - clockInTime);
    const totalMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const totalHours = `${hours}h ${mins}m`;

    record.clockOut = now;
    record.totalMinutes = totalMinutes;
    record.totalHours = totalHours;

    // If total worked time is under 4 hours (240 min), mark Half Day
    if (totalMinutes < 240 && record.status === 'Present') {
      record.status = 'Half Day';
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: `Clock-out successful at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Total time: ${totalHours}`,
      record,
    });
  } catch (error) {
    console.error('Clock-out Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record clock-out',
      error: error.message,
    });
  }
};

/**
 * GET /api/attendance/today
 * Retrieve today's punch state for the logged-in employee
 */
const getTodayStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getTodayDateString();

    const record = await Attendance.findOne({ user: userId, date: today });

    const isCheckedIn = Boolean(record && record.clockIn && !record.clockOut);

    return res.status(200).json({
      success: true,
      isCheckedIn,
      record: record || null,
      serverTime: new Date().toISOString(),
      clientIp: getClientIp(req),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance status',
      error: error.message,
    });
  }
};

/**
 * GET /api/attendance/my
 * Get logged-in user's personal attendance history
 */
const getMyAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const records = await Attendance.find({ user: userId }).sort({ date: -1 }).limit(60);

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your attendance history',
      error: error.message,
    });
  }
};

/**
 * GET /api/attendance
 * Admin & HR overview: Get all employee attendance records with filters
 */
const getAllAttendance = async (req, res) => {
  try {
    const { date, status, search } = req.query;
    const queryDate = date || getTodayDateString();

    const filter = {};
    if (queryDate !== 'All') {
      filter.date = queryDate;
    }
    if (status && status !== 'All') {
      filter.status = status;
    }

    const canViewAll =
      req.user.isSuperAdmin ||
      req.user.hasPermission('manage_attendance') ||
      req.user.hasPermission('manage_attandance') ||
      req.user.hasPermission('view_attendance') ||
      req.user.can('manage', 'attendance') ||
      req.user.can('view', 'attendance');

    if (!canViewAll) {
      filter.user = req.user._id;
    }

    const records = await Attendance.find(filter)
      .populate('user', 'name email role status')
      .populate('employee', 'name employeeId department designation avatar')
      .sort({ createdAt: -1 });

    // Summary metrics for the queried date
    const totalPresent = records.filter((r) => r.status === 'Present').length;
    const totalLate = records.filter((r) => r.status === 'Late').length;
    const totalHalfDay = records.filter((r) => r.status === 'Half Day').length;
    const totalClockedIn = records.filter((r) => r.clockIn && !r.clockOut).length;

    return res.status(200).json({
      success: true,
      date: queryDate,
      count: records.length,
      metrics: {
        totalPunches: records.length,
        totalPresent,
        totalLate,
        totalHalfDay,
        activeShifts: totalClockedIn,
      },
      records,
    });
  } catch (error) {
    console.error('Get All Attendance Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch organization attendance roster',
      error: error.message,
    });
  }
};

/**
 * POST /api/attendance/leave
 * Apply for leave
 */
const applyLeave = async (req, res) => {
  try {
    const { type, from, to, days, reason } = req.body;

    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required' });
    }

    const leave = await LeaveRequest.create({
      user: req.user._id,
      employee: req.user.employeeProfile?._id || req.user.employeeProfile || null,
      type: type || 'Casual Leave',
      from,
      to,
      days: Number(days) || 1,
      reason: reason || '',
      status: 'Pending Review',
    });

    return res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully for manager approval',
      leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to submit leave request',
      error: error.message,
    });
  }
};

/**
 * GET /api/attendance/leaves
 * Get leave requests
 */
const getLeaveRequests = async (req, res) => {
  try {
    const canManageLeaves =
      req.user.isSuperAdmin ||
      req.user.hasPermission('manage_attendance') ||
      req.user.hasPermission('manage_attandance') ||
      req.user.hasPermission('approve_leave') ||
      req.user.can('manage', 'attendance');

    const query = canManageLeaves ? {} : { user: req.user._id };

    const leaves = await LeaveRequest.find(query)
      .populate('user', 'name email role')
      .populate('employee', 'name employeeId department designation avatar')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      leaves,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error.message,
    });
  }
};

/**
 * PUT /api/attendance/leaves/:id
 * Approve / Reject leave request
 */
const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const canApprove =
      req.user.isSuperAdmin ||
      req.user.hasPermission('manage_attendance') ||
      req.user.hasPermission('manage_attandance') ||
      req.user.hasPermission('approve_leave') ||
      req.user.can('manage', 'attendance');

    if (!canApprove) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role '${req.user.role}' is not authorized to approve or reject leave applications.`,
      });
    }

    if (!['Approved', 'Rejected', 'Pending Review'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid leave status' });
    }

    const leave = await LeaveRequest.findById(id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    await leave.save();

    return res.status(200).json({
      success: true,
      message: `Leave request has been marked as ${status}`,
      leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update leave status',
      error: error.message,
    });
  }
};

module.exports = {
  clockIn,
  clockOut,
  getTodayStatus,
  getMyAttendance,
  getAllAttendance,
  applyLeave,
  getLeaveRequests,
  updateLeaveStatus,
};
