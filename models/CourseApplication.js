const mongoose = require('mongoose');

const courseApplicationSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    courseTitle: {
      type: String,
      required: [true, 'Course title is required'],
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
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
    collegeOrCompany: {
      type: String,
      trim: true,
      default: '',
    },
    experienceLevel: {
      type: String,
      default: 'Student / Fresher',
    },
    learningGoal: {
      type: String,
      default: 'Career Transition / Upskilling',
    },
    modePreference: {
      type: String,
      default: 'Live Online Labs',
    },
    status: {
      type: String,
      enum: ['Pending', 'Screening', 'Approved', 'Enrolled', 'Rejected', 'Completed'],
      default: 'Pending',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const CourseApplication = mongoose.model('CourseApplication', courseApplicationSchema);

module.exports = { CourseApplication };
