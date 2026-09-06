const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
    },
    batchCode: {
      type: String,
      required: [true, 'Batch code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    trainers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    startDate: {
      type: Date,
      required: [true, 'Batch start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Batch end date is required'],
    },
    capacity: {
      type: Number,
      default: 30,
      min: [1, 'Capacity must be at least 1'],
    },
    enrolledCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    mode: {
      type: String,
      enum: ['Online', 'Offline', 'Hybrid'],
      default: 'Online',
    },
    scheduleDays: {
      type: [String],
      default: ['Monday', 'Wednesday', 'Friday'],
    },
    startTime: {
      type: String,
      default: '19:00',
    },
    endTime: {
      type: String,
      default: '21:00',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    meetingProvider: {
      type: String,
      enum: ['Google Meet', 'Zoom', 'Microsoft Teams', 'Custom', 'Physical Campus'],
      default: 'Google Meet',
    },
    meetingLink: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Draft', 'Upcoming', 'Active', 'Completed', 'Cancelled', 'Archived'],
      default: 'Upcoming',
    },
    enrollmentOpenDate: {
      type: Date,
      default: Date.now,
    },
    enrollmentCloseDate: {
      type: Date,
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

// Indexes for fast cohort lookup
batchSchema.index({ course: 1, status: 1 });
batchSchema.index({ startDate: 1 });

const Batch = mongoose.model('Batch', batchSchema);
Batch.Batch = Batch;

module.exports = Batch;
