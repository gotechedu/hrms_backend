const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Holiday date is required'], // e.g. "2025-08-15"
    },
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    type: {
      type: String,
      enum: ['Public Holiday', 'National Holiday', 'Restricted Holiday'],
      default: 'Public Holiday',
    },
    year: {
      type: String,
      default: '2025',
    },
    isOptional: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = { Holiday };
