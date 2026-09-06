const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = [
  'superadmin',
  'admin',
  'hr',
  'employee',
  'intern',
  'manager',
  'teamlead',
  'trainer',
  'trainee',
  'sales_manager',
  'development_manager',
  'deployment_manager',
  'support_staff',
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide a work email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Do not return password by default in queries
    },
    role: {
      type: String,
      default: 'employee',
      lowercase: true,
      trim: true,
      enum: ROLES,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    collegeOrCompany: {
      type: String,
      default: '',
      trim: true,
    },
    qualification: {
      type: String,
      default: '',
      trim: true,
    },
    enrolledCourses: [
      {
        course: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
        },
        application: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'CourseApplication',
        },
        courseTitle: String,
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          default: 'Active',
        },
      },
    ],
    employeeProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      lowercase: true,
    },
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.resetPasswordOtp;
        delete ret.resetPasswordExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare candidate password with stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

User.User = User;
User.ROLES = ROLES;

module.exports = User;
module.exports.User = User;
module.exports.ROLES = ROLES;
