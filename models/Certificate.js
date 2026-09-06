const mongoose = require('mongoose');
const crypto = require('crypto');

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    verificationCode: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    trainee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    traineeName: {
      type: String,
      required: true,
    },
    traineeEmail: {
      type: String,
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    courseTitle: {
      type: String,
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    batchName: {
      type: String,
      default: '',
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    completionDate: {
      type: Date,
      default: Date.now,
    },
    finalScore: {
      type: Number,
      default: 100,
    },
    attendancePercentage: {
      type: Number,
      default: 100,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['Valid', 'Revoked'],
      default: 'Valid',
    },
    certificateUrl: {
      type: String,
      default: '',
    },
    qrCodeData: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

certificateSchema.pre('validate', function () {
  if (!this.certificateId) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.certificateId = `GTE-CERT-${new Date().getFullYear()}-${randomHex}`;
  }
  if (!this.verificationCode) {
    this.verificationCode = crypto.randomBytes(8).toString('hex');
  }
});

certificateSchema.index({ trainee: 1, course: 1 });

const Certificate = mongoose.model('Certificate', certificateSchema);
Certificate.Certificate = Certificate;

module.exports = Certificate;
