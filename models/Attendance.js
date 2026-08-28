const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    date: {
      type: String,
      required: true,
      index: true, // Format: YYYY-MM-DD
    },
    clockIn: {
      type: Date,
      required: true,
    },
    clockOut: {
      type: Date,
      default: null,
    },
    totalMinutes: {
      type: Number,
      default: 0,
    },
    totalHours: {
      type: String,
      default: '0h 0m',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Half Day', 'Absent', 'On Leave'],
      default: 'Present',
    },
    mode: {
      type: String,
      default: 'Web System Punch',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so a user has one primary attendance record per day
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

const leaveRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    type: {
      type: String,
      required: true,
      default: 'Casual Leave',
    },
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      required: true,
    },
    days: {
      type: Number,
      default: 1,
    },
    reason: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending Review', 'Approved', 'Rejected'],
      default: 'Pending Review',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);
const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

module.exports = { Attendance, LeaveRequest };
