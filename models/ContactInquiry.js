const mongoose = require('mongoose');

const contactInquirySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    service: {
      type: String,
      default: 'Enterprise Software (ERP/CRM/POS)',
      trim: true,
    },
    budget: {
      type: String,
      default: '$10,000 – $50,000',
    },
    message: {
      type: String,
      required: [true, 'Project scope message is required'],
      trim: true,
    },
    source: {
      type: String,
      default: 'Official Portal Contact Form',
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'In Discussion', 'Proposal Sent', 'Converted', 'Closed'],
      default: 'New',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    assignedToName: {
      type: String,
      default: '',
    },
    adminNotes: [
      {
        note: { type: String, required: true },
        author: { type: String, default: 'Admin' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
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

contactInquirySchema.index({ email: 1, createdAt: -1 });
contactInquirySchema.index({ status: 1 });
contactInquirySchema.index({ isDeleted: 1 });

const ContactInquiry = mongoose.model('ContactInquiry', contactInquirySchema);

module.exports = { ContactInquiry };
