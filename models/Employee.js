const mongoose = require('mongoose');
const { ROLES } = require('./User');

const EMPLOYEE_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote'];
const EMPLOYEE_STATUSES = ['Active', 'Inactive', 'On Leave', 'Probation', 'Terminated'];

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Please provide employee name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide employee work email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      default: 'employee',
      lowercase: true,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
      default: 'Team Member',
    },
    department: {
      type: String,
      required: [true, 'Please provide department'],
      trim: true,
      default: 'Engineering',
    },
    type: {
      type: String,
      enum: EMPLOYEE_TYPES,
      default: 'Full-Time',
    },
    status: {
      type: String,
      enum: EMPLOYEE_STATUSES,
      default: 'Active',
    },
    salary: {
      type: String,
      trim: true,
      default: '',
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: String,
      trim: true,
      default: 'Gurugram, HQ',
    },
    avatar: {
      type: String,
      default: '',
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    teamLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      name: { type: String, default: '' },
      relation: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    bankDetails: {
      accountHolder: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      bankName: { type: String, default: '' },
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'India' },
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

// Auto-generate employeeId if not provided (e.g. GTE-1001)
employeeSchema.pre('save', async function () {
  if (!this.employeeId) {
    try {
      const count = await mongoose.model('Employee').countDocuments();
      this.employeeId = `GTE-${String(count + 1001).padStart(4, '0')}`;
    } catch (err) {
      this.employeeId = `GTE-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }
});

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = {
  Employee,
  EMPLOYEE_TYPES,
  EMPLOYEE_STATUSES,
};
