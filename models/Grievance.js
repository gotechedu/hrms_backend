const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  actionBy: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
  stage: {
    type: String,
    required: true,
  },
});

const grievanceSchema = new mongoose.Schema(
  {
    grievanceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    filedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    filerName: {
      type: String,
      default: 'Confidential Employee',
      trim: true,
    },
    filerDepartment: {
      type: String,
      default: 'Engineering',
      trim: true,
    },
    filerEmail: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Workplace Environment',
        'Payroll & Overtime',
        'Equipment & Infrastructure',
        'Code of Conduct & Ethics',
        'Other',
      ],
      default: 'Workplace Environment',
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical / Urgent'],
      default: 'Medium',
    },
    subject: {
      type: String,
      required: [true, 'Grievance headline is required'],
      trim: true,
    },
    statement: {
      type: String,
      required: [true, 'Incident statement is required'],
      trim: true,
    },
    evidenceUrls: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: [
        'Submitted',
        'Under Investigation',
        'Arbitration Hearing',
        'Action Taken',
        'Resolved',
        'Closed',
      ],
      default: 'Submitted',
    },
    assignedOfficer: {
      name: {
        type: String,
        default: 'HR Ethics Committee',
      },
      role: {
        type: String,
        default: 'Compliance Ombudsman',
      },
      assignedAt: {
        type: Date,
        default: Date.now,
      },
    },
    auditTrail: [auditLogSchema],
    resolutionOutcome: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Grievance', grievanceSchema);
