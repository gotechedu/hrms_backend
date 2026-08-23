const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
    },
    department: {
      type: String,
      default: 'Engineering',
    },
    name: {
      type: String,
      required: [true, 'Applicant name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Applicant email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Applicant phone is required'],
      trim: true,
    },
    experience: {
      type: String,
      default: '2 Years',
    },
    currentCompany: {
      type: String,
      default: '',
    },
    expectedCTC: {
      type: String,
      default: '',
    },
    noticePeriod: {
      type: String,
      default: '30 Days',
    },
    resumeUrl: {
      type: String,
      default: '',
    },
    portfolioUrl: {
      type: String,
      default: '',
    },
    coverLetter: {
      type: String,
      default: '',
    },
    stage: {
      type: String,
      enum: ['Applied', 'Screening', 'Technical Round 2', 'Offer Sent', 'Hired', 'Rejected'],
      default: 'Applied',
    },
    rating: {
      type: Number,
      default: 4,
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

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

module.exports = { JobApplication };
