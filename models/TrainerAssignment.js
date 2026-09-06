const mongoose = require('mongoose');

const trainerAssignmentSchema = new mongoose.Schema(
  {
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trainer user reference is required'],
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
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['Primary Trainer', 'Assistant Trainer', 'Mentor', 'Guest Lecturer'],
      default: 'Primary Trainer',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Completed'],
      default: 'Active',
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

trainerAssignmentSchema.index({ trainer: 1, batch: 1 }, { unique: true });
trainerAssignmentSchema.index({ batch: 1 });
trainerAssignmentSchema.index({ trainer: 1 });

const TrainerAssignment = mongoose.model('TrainerAssignment', trainerAssignmentSchema);
TrainerAssignment.TrainerAssignment = TrainerAssignment;

module.exports = TrainerAssignment;
