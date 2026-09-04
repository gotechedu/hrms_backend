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
    image: {
      type: String,
      default: '',
    },
    previewImage: {
      type: String,
      default: '',
    },
    thumbnail: {
      type: String,
      default: '',
    },
    bannerImage: {
      type: String,
      default: '',
    },
    heroTagline: {
      type: String,
      default: '',
    },
    duration: {
      type: String,
      default: '12 Weeks',
    },
    totalHours: {
      type: String,
      default: '120+ Hours',
    },
    lecturesCount: {
      type: Number,
      default: 60,
    },
    nextBatchDate: {
      type: String,
      default: 'Upcoming Cohort 2026',
    },
    averageSalaryHike: {
      type: String,
      default: '70%',
    },
    rating: {
      type: Number,
      default: 4.88,
    },
    reviewsCount: {
      type: Number,
      default: 1250,
    },
    enrolledStudents: {
      type: Number,
      default: 3500,
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
    overviewParagraph: {
      type: String,
      default: '',
    },
    whatYouWillLearn: {
      type: [String],
      default: [],
    },
    prerequisites: {
      type: [String],
      default: [],
    },
    techStack: {
      type: [String],
      default: [],
    },
    modules: {
      type: [String],
      default: [],
    },
    syllabusModules: [
      {
        moduleNumber: Number,
        title: String,
        duration: String,
        lectures: [
          {
            title: String,
            duration: String,
            isPreview: Boolean,
            type: { type: String, default: 'video' },
          },
        ],
      },
    ],
    careerOutcome: {
      type: String,
      default: 'Full-Stack Software Engineer (₹8L – ₹18L PA)',
    },
    price: {
      type: String,
      default: 'Free & Industry Sponsored',
    },
    originalPrice: {
      type: Number,
      default: 49999,
    },
    discountedPrice: {
      type: Number,
      default: 24999,
    },
    emiStartsAt: {
      type: Number,
      default: 2083,
    },
    offers: [
      {
        code: String,
        title: String,
        discountPercent: Number,
        description: String,
        badge: String,
      },
    ],
    modulesList: [
      {
        title: String,
        duration: String,
        topics: [String],
      },
    ],
    instructor: {
      name: { type: String, default: 'Dr. Vikram Sharma' },
      role: { type: String, default: 'Lead Full-Stack Architect' },
      organization: { type: String, default: 'GoTechEdu Labs' },
      avatar: { type: String, default: '' },
    },
    instructors: [
      {
        name: String,
        role: String,
        organization: String,
        rating: Number,
        students: String,
        coursesCount: Number,
        bio: String,
        avatar: String,
      },
    ],
    faqs: [
      {
        question: String,
        answer: String,
      },
    ],
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
