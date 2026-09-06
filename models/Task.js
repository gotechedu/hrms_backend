const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    projectName: {
      type: String,
      default: 'General Support',
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    assigneeName: {
      type: String,
      default: 'Unassigned',
    },
    priority: {
      type: String,
      enum: ['Urgent', 'High', 'Medium', 'Normal'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Review', 'Done'],
      default: 'To Do',
    },
    deadline: {
      type: String,
      required: [true, 'Task due date is required'],
    },
    estimatedHours: {
      type: Number,
      default: 8,
    },
    loggedHours: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto generate taskId before saving if not present
taskSchema.pre('save', function () {
  if (!this.taskId) {
    const randomNum = Math.floor(100 + Math.random() * 900);
    this.taskId = `TSK-${randomNum}`;
  }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = { Task };
