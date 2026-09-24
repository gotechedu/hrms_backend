const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    inquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContactInquiry',
      default: null,
    },
    type: {
      type: String,
      enum: ['learning_course', 'solution'],
      required: true,
      default: 'learning_course',
    },
    recipient: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
      company: { type: String, default: '', trim: true },
    },
    // Learning Course Specific Fields
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    courseTitle: {
      type: String,
      default: '',
    },
    courseCategory: {
      type: String,
      default: 'Software Development',
    },
    duration: {
      type: String,
      default: '',
    },
    batch: {
      type: String,
      default: 'Current Cohort 2026',
    },
    curriculumHighlights: {
      type: [String],
      default: [],
    },
    // Solution Specific Fields
    solutionTitle: {
      type: String,
      default: '',
    },
    serviceType: {
      type: String,
      default: 'Enterprise Software (ERP/CRM/POS)',
    },
    scopeDescription: {
      type: String,
      default: '',
    },
    modules: {
      type: [String],
      default: [],
    },
    estimatedDuration: {
      type: String,
      default: '',
    },
    // Pricing Fields
    exactPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    offeredPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    // Payment Configuration
    upiIds: {
      type: [String],
      default: ['gotechedu@ibl', 'gotechedu@axl', 'gotechedu@ybl'],
    },
    primaryUpi: {
      type: String,
      default: 'gotechedu@ybl',
    },
    qrCodeData: {
      type: String,
      default: '',
    },
    validUntil: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days standard validity
    },
    terms: {
      type: String,
      default: '1. Standard warranty & support included.\n2. Access activated immediately upon UPI transaction verification.\n3. Course materials & lab environment access valid for lifetime.',
    },
    notes: {
      type: String,
      default: '',
    },
    // Quotation Lifecycle State
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Viewed', 'Payment_Submitted', 'Verified', 'Rejected', 'Expired'],
      default: 'Sent',
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    viewedAt: {
      type: Date,
      default: null,
    },
    // Student Registration & Payment Confirmation Submission
    paymentSubmission: {
      studentName: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      collegeOrCompany: { type: String, default: '' },
      qualification: { type: String, default: '' },
      utrNumber: { type: String, default: '' },
      paymentMode: { type: String, default: 'UPI Transfer' },
      upiIdPaidTo: { type: String, default: 'gotechedu@ybl' },
      amountPaid: { type: Number, default: 0 },
      submittedAt: { type: Date, default: null },
      notes: { type: String, default: '' },
    },
    // System Cross-References
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    courseApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseApplication',
      default: null,
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

// Auto-generate sequential quotation number if missing
quotationSchema.pre('validate', function () {
  if (!this.quotationNumber) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.quotationNumber = `QT-${new Date().getFullYear()}-${randomSuffix}`;
  }
  if (this.exactPrice && this.offeredPrice) {
    this.discount = Math.max(0, this.exactPrice - this.offeredPrice);
  }
});

quotationSchema.index({ 'recipient.email': 1 });
quotationSchema.index({ inquiry: 1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ isDeleted: 1 });

const Quotation = mongoose.model('Quotation', quotationSchema);

module.exports = { Quotation };
