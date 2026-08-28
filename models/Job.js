const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      default: 'Engineering',
    },
    type: {
      type: String,
      enum: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote', 'Hybrid'],
      default: 'Full-Time',
    },
    location: {
      type: String,
      default: 'Gurugram, HQ / Remote',
    },
    experience: {
      type: String,
      default: '2–4 Years',
    },
    salary: {
      type: String,
      default: '₹12L – ₹20L PA',
    },
    tags: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
    },
    requirements: {
      type: [String],
      default: [],
    },
    responsibilities: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Active', 'Closed', 'Draft'],
      default: 'Active',
    },
    applicantsCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.pre('save', function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
});

const Job = mongoose.model('Job', jobSchema);

module.exports = { Job };
