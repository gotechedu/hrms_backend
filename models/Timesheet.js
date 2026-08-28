const mongoose = require('mongoose');

const timesheetSchema = new mongoose.Schema(
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
    weekStartDate: {
      type: String,
      required: true, // e.g. "2026-08-24" (Monday)
    },
    project: {
      type: String,
      required: true,
      default: 'Core Platform Engineering',
    },
    client: {
      type: String,
      default: 'Internal GoTechEdu',
    },
    taskCategory: {
      type: String,
      enum: [
        'Development',
        'UI/UX Design',
        'Quality Assurance',
        'Code Review & Architecture',
        'Sprint Planning & Meetings',
        'DevOps & Cloud Infrastructure',
        'Client Support & Training',
      ],
      default: 'Development',
    },
    dailyHours: {
      mon: { type: Number, default: 0, min: 0, max: 24 },
      tue: { type: Number, default: 0, min: 0, max: 24 },
      wed: { type: Number, default: 0, min: 0, max: 24 },
      thu: { type: Number, default: 0, min: 0, max: 24 },
      fri: { type: Number, default: 0, min: 0, max: 24 },
      sat: { type: Number, default: 0, min: 0, max: 24 },
      sun: { type: Number, default: 0, min: 0, max: 24 },
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    billableHours: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Approved', 'Rejected'],
      default: 'Submitted',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewRemarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Timesheet = mongoose.model('Timesheet', timesheetSchema);

module.exports = { Timesheet };
