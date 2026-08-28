const mongoose = require('mongoose');

const PAYROLL_CATEGORIES = ['org-employee', 'student', 'it-solution'];
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Processing', 'Failed'];
const PAYMENT_METHODS = ['Direct Bank Transfer', 'UPI', 'Cheque', 'Cash', 'NEFT/RTGS'];

const payrollSchema = new mongoose.Schema(
  {
    payrollId: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: PAYROLL_CATEGORIES,
      required: [true, 'Payroll category is required (org-employee, student, it-solution)'],
      default: 'org-employee',
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    recipientName: {
      type: String,
      required: [true, 'Recipient name is required'],
      trim: true,
    },
    recipientEmail: {
      type: String,
      required: [true, 'Recipient email is required'],
      lowercase: true,
      trim: true,
    },
    recipientPhone: {
      type: String,
      trim: true,
      default: '',
    },
    roleDesignation: {
      type: String,
      trim: true,
      default: 'Staff',
    },
    department: {
      type: String,
      trim: true,
      default: 'General',
    },
    month: {
      type: String,
      required: [true, 'Payroll month is required (e.g. August 2026)'],
      default: 'August 2026',
    },
    year: {
      type: Number,
      default: 2026,
    },
    // Base salary / Stipend / Contract fee
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary / stipend amount is required'],
      default: 0,
    },
    // Allowances
    hra: {
      type: Number,
      default: 0,
    },
    da: {
      type: Number,
      default: 0,
    },
    specialAllowance: {
      type: Number,
      default: 0,
    },
    performanceBonus: {
      type: Number,
      default: 0,
    },
    // Deductions
    pfDeduction: {
      type: Number,
      default: 0,
    },
    taxDeduction: {
      type: Number,
      default: 0,
    },
    leaveDeduction: {
      type: Number,
      default: 0,
    },
    otherDeductions: {
      type: Number,
      default: 0,
    },
    // Calculated Net Salary
    netSalary: {
      type: Number,
      default: 0,
    },
    // Payment Details
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'Direct Bank Transfer',
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    transactionId: {
      type: String,
      trim: true,
      default: '',
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
    remarks: {
      type: String,
      default: '',
    },
    // Category-specific metadata
    studentBatch: {
      type: String,
      default: '',
    },
    contractProject: {
      type: String,
      default: '',
    },
    contractMilestone: {
      type: String,
      default: '',
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

// Auto compute netSalary and payrollId before save
payrollSchema.pre('save', async function () {
  const totalEarnings =
    Number(this.basicSalary || 0) +
    Number(this.hra || 0) +
    Number(this.da || 0) +
    Number(this.specialAllowance || 0) +
    Number(this.performanceBonus || 0);

  const totalDeductions =
    Number(this.pfDeduction || 0) +
    Number(this.taxDeduction || 0) +
    Number(this.leaveDeduction || 0) +
    Number(this.otherDeductions || 0);

  this.netSalary = Math.max(0, totalEarnings - totalDeductions);

  if (!this.payrollId) {
    const prefix =
      this.category === 'student'
        ? 'STU-PAY'
        : this.category === 'it-solution'
        ? 'IT-PAY'
        : 'EMP-PAY';
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.payrollId = `${prefix}-${Date.now().toString().slice(-4)}-${rand}`;
  }
});

const Payroll = mongoose.model('Payroll', payrollSchema);

module.exports = {
  Payroll,
  PAYROLL_CATEGORIES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
};
