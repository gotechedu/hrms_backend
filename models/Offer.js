const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Offer title is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Offer description is required'],
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT_AMOUNT'],
      default: 'PERCENTAGE',
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
    },
    couponType: {
      type: String,
      enum: ['ALL_COURSES', 'SPECIFIC_COURSE', 'SPECIFIC_STUDENT'],
      default: 'ALL_COURSES',
    },
    targetCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    targetCourseTitle: {
      type: String,
      default: '',
    },
    targetStudentEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    bannerImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    },
    badgeText: {
      type: String,
      default: '50% OFF TODAY',
    },
    ctaText: {
      type: String,
      default: 'Grab This Offer',
    },
    isVisibleOnPortal: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Expired'],
      default: 'Active',
    },
    validUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Offer = mongoose.models.Offer || mongoose.model('Offer', offerSchema);

module.exports = { Offer };
