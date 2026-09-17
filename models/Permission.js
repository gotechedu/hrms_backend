const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: [true, 'Please provide module category (e.g. employee, attendance, payroll)'],
      trim: true,
      lowercase: true,
    },
    permission: {
      type: String,
      required: [true, 'Please provide permission key (e.g. create_employee, manage_attendance)'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide readable permission name'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure slug and permission are always in sync
permissionSchema.pre('validate', function () {
  if (!this.permission && this.slug) {
    this.permission = this.slug;
  }
  if (!this.slug && this.permission) {
    this.slug = this.permission;
  }
  if (!this.module) {
    this.module = 'general';
  }
});

const Permission = mongoose.model('Permission', permissionSchema);

module.exports = { Permission };
