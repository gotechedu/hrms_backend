const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    trainee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trainee reference is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseApplication',
    },
    enrollmentNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Pending', 'Completed', 'Suspended', 'Cancelled'],
      default: 'Active',
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    attendancePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    certificateEligible: {
      type: Boolean,
      default: false,
    },
    certificateIssued: {
      type: Boolean,
      default: false,
    },
    certificate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
      default: null,
    },
    lastAccessedLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    paymentDetails: {
      orderId: String,
      paymentId: String,
      amount: Number,
      paidAt: Date,
      method: { type: String, default: 'Razorpay Online' },
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate enrollment number if missing
enrollmentSchema.pre('validate', function () {
  if (!this.enrollmentNumber) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.enrollmentNumber = `ENR-${new Date().getFullYear()}-${randomSuffix}`;
  }
});

// Indexes
enrollmentSchema.index({ trainee: 1, course: 1, batch: 1 });
enrollmentSchema.index({ batch: 1, status: 1 });
enrollmentSchema.index({ trainee: 1, status: 1 });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
Enrollment.Enrollment = Enrollment;

module.exports = Enrollment;
