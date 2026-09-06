const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  questionType: {
    type: String,
    enum: ['mcq', 'multi_select', 'true_false', 'short_answer'],
    default: 'mcq',
  },
  options: [
    {
      text: { type: String, required: true },
      isCorrect: { type: Boolean, default: false },
    },
  ],
  explanation: {
    type: String,
    default: '',
  },
  points: {
    type: Number,
    default: 1,
  },
});

const assessmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['Quiz', 'Exam', 'Final Assessment'],
      default: 'Quiz',
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    durationMinutes: {
      type: Number,
      default: 30, // 0 = untimed
    },
    passingPercentage: {
      type: Number,
      default: 60,
    },
    maxAttempts: {
      type: Number,
      default: 3, // 0 = unlimited
    },
    questions: [questionSchema],
    totalPoints: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Archived'],
      default: 'Published',
    },
  },
  {
    timestamps: true,
  }
);

assessmentSchema.pre('save', function () {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 1), 0);
  }
});

assessmentSchema.index({ course: 1, module: 1 });

const Assessment = mongoose.model('Assessment', assessmentSchema);

module.exports = { Assessment };
