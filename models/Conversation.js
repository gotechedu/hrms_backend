const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['direct', 'channel', 'group'],
      default: 'direct',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isChannel: {
      type: Boolean,
      default: false,
    },
    channelSlug: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    participants: [participantSchema],
    lastMessage: {
      text: {
        type: String,
        default: '',
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      senderName: {
        type: String,
        default: '',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      attachmentsCount: {
        type: Number,
        default: 0,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ 'participants.user': 1, updatedAt: -1 });
conversationSchema.index({ type: 1, channelSlug: 1 });

const Conversation =
  mongoose.models.Conversation ||
  mongoose.model('Conversation', conversationSchema);

module.exports = { Conversation };
