const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module reference is required'],
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    order: {
      type: Number,
      default: 1,
    },
    duration: {
      type: String,
      default: '30 mins',
    },
    contentType: {
      type: String,
      enum: ['video', 'pdf', 'document', 'text', 'external_link', 'live_class'],
      default: 'video',
    },
    videoUrl: {
      type: String,
      default: '',
    },
    videoProvider: {
      type: String,
      enum: ['youtube', 'vimeo', 's3', 'external'],
      default: 'youtube',
    },
    contentBody: {
      type: String,
      default: '', // Markdown or HTML rich text
    },
    documentUrl: {
      type: String,
      default: '',
    },
    externalUrl: {
      type: String,
      default: '',
    },
    resources: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
        fileType: { type: String, default: 'pdf' },
        fileSize: { type: String, default: '' },
      },
    ],
    isPreview: {
      type: Boolean,
      default: false,
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

lessonSchema.index({ course: 1, module: 1, order: 1 });
lessonSchema.index({ module: 1, order: 1 });

const Lesson = mongoose.model('Lesson', lessonSchema);
Lesson.Lesson = Lesson;

module.exports = Lesson;

