const mongoose = require('mongoose');

const clauseSchema = new mongoose.Schema({
  clauseNumber: {
    type: String,
    required: true,
  },
  heading: {
    type: String,
    required: true,
    trim: true,
  },
  text: {
    type: String,
    required: true,
  },
  isMandatory: {
    type: Boolean,
    default: true,
  },
});

const policySchema = new mongoose.Schema(
  {
    policyCode: {
      type: String,
      required: [true, 'Policy code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: [true, 'Policy title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Workplace Environment',
        'Payroll & Overtime',
        'Equipment & Infrastructure',
        'Code of Conduct & Ethics',
        'Remote Work & Security',
        'Disciplinary Framework',
        'General Policy',
      ],
      default: 'Workplace Environment',
    },
    scope: {
      type: String,
      enum: ['Org-Wide', 'Role-Based'],
      default: 'Org-Wide',
    },
    targetRoles: [
      {
        type: String,
        trim: true,
      },
    ],
    version: {
      type: String,
      default: 'v1.0',
      trim: true,
    },
    effectiveDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    lastReviewed: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    summary: {
      type: String,
      required: [true, 'Policy summary is required'],
      trim: true,
    },
    clauses: [clauseSchema],
    attachmentUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Under Revision', 'Archived'],
      default: 'Active',
    },
    requiresAcknowledgement: {
      type: Boolean,
      default: true,
    },
    acknowledgedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        userName: String,
        userRole: String,
        acknowledgedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Policy', policySchema);
