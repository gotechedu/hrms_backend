const mongoose = require('mongoose');

const learningAttendanceSchema = new mongoose.Schema(
  {
    trainee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trainee reference is required'],
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch reference is required'],
    },
    classSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSession',
      required: [true, 'Class session reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Excused'],
      default: 'Present',
    },
    remarks: {
      type: String,
      default: '',
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

learningAttendanceSchema.index({ trainee: 1, classSession: 1 }, { unique: true });
learningAttendanceSchema.index({ batch: 1, date: 1 });
learningAttendanceSchema.index({ trainee: 1, batch: 1 });

const LearningAttendance = mongoose.model('LearningAttendance', learningAttendanceSchema);

module.exports = { LearningAttendance };
