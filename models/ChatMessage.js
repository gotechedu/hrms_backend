const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    name: { type: String, default: 'attachment' },
    fileType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, default: '' },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderRole: {
      type: String,
      default: 'Team Member',
      trim: true,
    },
    senderAvatar: {
      type: String,
      default: '',
    },
    text: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: [attachmentSchema],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reactions: [reactionSchema],
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

chatMessageSchema.index({ conversation: 1, createdAt: 1 });

const ChatMessage =
  mongoose.models.ChatMessage ||
  mongoose.model('ChatMessage', chatMessageSchema);

module.exports = { ChatMessage };
