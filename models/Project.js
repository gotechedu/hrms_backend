const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    client: {
      type: String,
      required: [true, 'Client organization is required'],
      trim: true,
    },
    category: {
      type: String,
      default: 'Full-Stack Web & Mobile',
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    leadName: {
      type: String,
      default: '',
    },
    budget: {
      type: String,
      default: '₹0',
    },
    startDate: {
      type: String,
      default: '',
    },
    deadline: {
      type: String,
      required: [true, 'Target deadline date is required'],
    },
    status: {
      type: String,
      enum: ['In Progress', 'Review & QA', 'Completed', 'On Hold'],
      default: 'In Progress',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      default: '',
      trim: true,
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

// Auto generate projectId before saving if not present
projectSchema.pre('save', async function (next) {
  if (!this.projectId) {
    const randomNum = Math.floor(100 + Math.random() * 900);
    this.projectId = `PRJ-${randomNum}`;
  }
  next();
});

const Project = mongoose.model('Project', projectSchema);

module.exports = { Project };
