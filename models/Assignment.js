const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    instructions: {
      type: String,
      default: '',
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    maxMarks: {
      type: Number,
      default: 100,
      min: 1,
    },
    passingMarks: {
      type: Number,
      default: 50,
      min: 0,
    },
    allowedFileTypes: {
      type: [String],
      default: ['pdf', 'zip', 'docx', 'png', 'jpg'],
    },
    maxFileSizeMb: {
      type: Number,
      default: 25,
    },
    submissionType: {
      type: String,
      enum: ['File Upload', 'GitHub / External Link', 'Rich Text / Code', 'Any'],
      default: 'Any',
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Archived'],
      default: 'Published',
    },
  },
  {
    timestamps: true,
  }
);

assignmentSchema.index({ course: 1, batch: 1 });
assignmentSchema.index({ dueDate: 1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = { Assignment };
