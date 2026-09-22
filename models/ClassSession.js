const mongoose = require('mongoose');

const classSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Class title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch reference is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trainer reference is required'],
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    sessionDate: {
      type: Date,
      required: [true, 'Session date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'], // e.g. "19:00"
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'], // e.g. "21:00"
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    meetingProvider: {
      type: String,
      enum: ['Google Meet', 'Zoom', 'Microsoft Teams', 'Custom', 'Classroom'],
      default: 'Google Meet',
    },
    meetingUrl: {
      type: String,
      default: '',
    },
    recordingUrl: {
      type: String,
      default: '',
    },
    circularUrl: {
      type: String,
      default: '',
      trim: true,
    },
    resources: [
      {
        title: String,
        url: String,
      },
    ],
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
  },
  {
    timestamps: true,
  }
);

classSessionSchema.index({ batch: 1, sessionDate: 1 });
classSessionSchema.index({ trainer: 1, sessionDate: 1 });

const ClassSession = mongoose.model('ClassSession', classSessionSchema);

module.exports = { ClassSession };
