const mongoose = require('mongoose');

const assessmentAttemptSchema = new mongoose.Schema(
  {
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment reference is required'],
    },
    trainee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trainee reference is required'],
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    answers: [
      {
        questionId: String,
        selectedOptionIndices: [Number],
        textAnswer: String,
        isCorrect: Boolean,
        pointsEarned: Number,
      },
    ],
    score: {
      type: Number,
      default: 0,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    isPassed: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['In Progress', 'Submitted', 'Graded'],
      default: 'Graded',
    },
  },
  {
    timestamps: true,
  }
);

assessmentAttemptSchema.index({ assessment: 1, trainee: 1 });
assessmentAttemptSchema.index({ trainee: 1, isPassed: 1 });

const AssessmentAttempt = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);

module.exports = { AssessmentAttempt };
