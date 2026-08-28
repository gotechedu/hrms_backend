const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a role name'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Please provide a unique role slug'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    badgeColor: {
      type: String,
      default: 'bg-slate-50 text-slate-700 border-slate-200',
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    permissions: {
      type: [String],
      default: [],
    },
    priority: {
      type: Number,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

const Role = mongoose.model('Role', roleSchema);

module.exports = { Role };
