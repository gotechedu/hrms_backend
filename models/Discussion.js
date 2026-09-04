const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  authorName: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
  },
  authorAvatar: {
    type: String,
    default: '',
  },
  authorRole: {
    type: String,
    default: 'Team Member',
  },
  content: {
    type: String,
    required: [true, 'Reply content is required'],
    trim: true,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const discussionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Discussion title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Discussion content is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'General',
        'Engineering & Tech',
        'Policy & HR',
        'Ideas & Feedback',
        'Announcements',
        'Project Collab',
      ],
      default: 'General',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    authorName: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
    },
    authorAvatar: {
      type: String,
      default: '',
    },
    authorRole: {
      type: String,
      default: 'Team Member',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['Open', 'Resolved', 'Archived'],
      default: 'Open',
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    replies: [replySchema],
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

discussionSchema.index({ isDeleted: 1, isPinned: -1, createdAt: -1 });
discussionSchema.index({ title: 'text', content: 'text' });

const Discussion = mongoose.models.Discussion || mongoose.model('Discussion', discussionSchema);

module.exports = { Discussion };
