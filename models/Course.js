const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Course category is required'],
      trim: true,
      default: 'Development',
    },
    duration: {
      type: String,
      default: '12 Weeks',
    },
    mode: {
      type: String,
      default: 'Live Online + Capstone Labs',
    },
    level: {
      type: String,
      default: 'Beginner to Advanced',
    },
    badge: {
      type: String,
      default: 'Popular',
    },
    color: {
      type: String,
      default: 'from-blue-600 to-cyan-500',
    },
    bgSoft: {
      type: String,
      default: 'bg-blue-50',
    },
    textCol: {
      type: String,
      default: 'text-blue-600',
    },
    borderCol: {
      type: String,
      default: 'border-blue-100',
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
    },
    techStack: {
      type: [String],
      default: [],
    },
    modules: {
      type: [String],
      default: [],
    },
    careerOutcome: {
      type: String,
      default: 'Full-Stack Software Engineer (₹8L – ₹18L PA)',
    },
    price: {
      type: String,
      default: 'Free & Industry Sponsored',
    },
    status: {
      type: String,
      enum: ['Active', 'Draft', 'Archived'],
      default: 'Active',
    },
    enrolledCount: {
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

// Auto slug generation
courseSchema.pre('save', function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
});

const Course = mongoose.model('Course', courseSchema);

module.exports = { Course };
