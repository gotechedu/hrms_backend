const mongoose = require('mongoose');
const { Conversation } = require('../models/Conversation');
const { ChatMessage } = require('../models/ChatMessage');
const { User } = require('../models/User');
const { Employee } = require('../models/Employee');
const { isUserOnline, getIO } = require('../socket');

/**
 * Standard default channels for workspace
 */
const DEFAULT_CHANNELS = [
  {
    name: 'General',
    slug: 'general',
    description: 'Company-wide general discussions, team updates, and casual chatter.',
  },
  {
    name: 'Announcements',
    slug: 'announcements',
    description: 'Official corporate announcements, HR policies, and critical memos.',
  },
  {
    name: 'Engineering & Tech',
    slug: 'engineering',
    description: 'Technical brainstorming, architecture discussions, and developer updates.',
  },
];

/**
 * Ensures system default channels exist and current user is enrolled
 */
const ensureUserInDefaultChannels = async (user) => {
  try {
    for (const ch of DEFAULT_CHANNELS) {
      let channel = await Conversation.findOne({
        type: 'channel',
        channelSlug: ch.slug,
      });

      if (!channel) {
        channel = new Conversation({
          name: ch.name,
          type: 'channel',
          isChannel: true,
          channelSlug: ch.slug,
          description: ch.description,
          participants: [
            {
              user: user._id,
              employee: user.employeeProfile || null,
              role: ['superadmin', 'admin', 'hr'].includes(user.role)
                ? 'admin'
                : 'member',
              joinedAt: new Date(),
              lastReadAt: new Date(),
              unreadCount: 0,
            },
          ],
        });
        await channel.save();
      } else {
        const isParticipant = channel.participants.some(
          (p) => p.user.toString() === user._id.toString()
        );
        if (!isParticipant) {
          channel.participants.push({
            user: user._id,
            employee: user.employeeProfile || null,
            role: ['superadmin', 'admin', 'hr'].includes(user.role)
              ? 'admin'
              : 'member',
            joinedAt: new Date(),
            lastReadAt: new Date(),
            unreadCount: 0,
          });
          await channel.save();
        }
      }
    }
  } catch (err) {
    console.warn('[Auto Enroll Channel Error]:', err.message);
  }
};

/**
 * @desc    Get all conversations (channels & DMs) for current user
 * @route   GET /api/chat/conversations
 * @access  Protected
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Auto enroll in default company channels
    await ensureUserInDefaultChannels(req.user);

    // Find conversations where user is a participant
    const conversations = await Conversation.find({
      'participants.user': userId,
      isArchived: { $ne: true },
    })
      .populate('participants.user', 'name email role status')
      .populate(
        'participants.employee',
        'name designation department avatar profilePicture employeeId'
      )
      .populate('lastMessage.sender', 'name')
      .sort({ updatedAt: -1 });

    // Format conversation records for client
    let unreadTotal = 0;

    const formatted = conversations.map((conv) => {
      const userParticipant = conv.participants.find(
        (p) => p.user && p.user._id && p.user._id.toString() === userId.toString()
      );
      const unreadCount = userParticipant ? userParticipant.unreadCount || 0 : 0;
      unreadTotal += unreadCount;

      let name = conv.name;
      let avatar = null;
      let role = null;
      let department = null;
      let isOnline = false;
      let otherParticipant = null;

      if (conv.type === 'direct') {
        otherParticipant = conv.participants.find(
          (p) => p.user && p.user._id && p.user._id.toString() !== userId.toString()
        );

        if (otherParticipant && otherParticipant.user) {
          name = otherParticipant.user.name;
          const otherUserId = otherParticipant.user._id.toString();
          isOnline = isUserOnline(otherUserId);

          if (otherParticipant.employee) {
            avatar =
              otherParticipant.employee.avatar ||
              otherParticipant.employee.profilePicture;
            role = otherParticipant.employee.designation;
            department = otherParticipant.employee.department;
          }

          if (!avatar) {
            avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              name || 'Teammate'
            )}&background=2563eb&color=fff`;
          }
          if (!role) {
            role = otherParticipant.user.role;
          }
        }
      }

      return {
        _id: conv._id,
        name: name || (conv.type === 'channel' ? `#${conv.name}` : 'Direct Message'),
        type: conv.type,
        isChannel: conv.isChannel,
        channelSlug: conv.channelSlug,
        description: conv.description,
        avatar,
        role,
        department,
        isOnline,
        unreadCount,
        lastMessage: conv.lastMessage,
        participantsCount: conv.participants.length,
        otherUser: otherParticipant ? otherParticipant.user : null,
        otherEmployee: otherParticipant ? otherParticipant.employee : null,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      unreadTotal,
      conversations: formatted,
    });
  } catch (error) {
    console.error('Get Conversations Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversations',
      error: error.message,
    });
  }
};

/**
 * @desc    Get or create 1-on-1 direct conversation with another user/employee
 * @route   POST /api/chat/direct
 * @access  Protected
 */
const getOrCreateDirectConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { recipientUserId, employeeId } = req.body;

    let targetUser = null;

    if (recipientUserId && mongoose.Types.ObjectId.isValid(recipientUserId)) {
      targetUser = await User.findById(recipientUserId).populate('employeeProfile');
    } else if (employeeId) {
      const employee = await Employee.findById(employeeId);
      if (employee && employee.user) {
        targetUser = await User.findById(employee.user).populate('employeeProfile');
      } else if (employee) {
        // Find user by email
        targetUser = await User.findOne({ email: employee.email }).populate('employeeProfile');
      }
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user record not found in system',
      });
    }

    if (targetUser._id.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot start a direct conversation with yourself',
      });
    }

    // Check if direct conversation already exists
    let conversation = await Conversation.findOne({
      type: 'direct',
      'participants.user': { $all: [currentUserId, targetUser._id] },
    })
      .populate('participants.user', 'name email role status')
      .populate(
        'participants.employee',
        'name designation department avatar profilePicture employeeId'
      );

    if (!conversation) {
      conversation = new Conversation({
        type: 'direct',
        isChannel: false,
        participants: [
          {
            user: currentUserId,
            employee: req.user.employeeProfile || null,
            role: 'member',
            joinedAt: new Date(),
            lastReadAt: new Date(),
            unreadCount: 0,
          },
          {
            user: targetUser._id,
            employee: targetUser.employeeProfile?._id || null,
            role: 'member',
            joinedAt: new Date(),
            lastReadAt: new Date(),
            unreadCount: 0,
          },
        ],
      });

      await conversation.save();

      conversation = await Conversation.findById(conversation._id)
        .populate('participants.user', 'name email role status')
        .populate(
          'participants.employee',
          'name designation department avatar profilePicture employeeId'
        );
    }

    // Format for response
    const otherParticipant = conversation.participants.find(
      (p) => p.user && p.user._id.toString() !== currentUserId.toString()
    );

    const fullName = otherParticipant?.user?.name || targetUser.name;
    const avatar =
      otherParticipant?.employee?.avatar ||
      otherParticipant?.employee?.profilePicture ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2563eb&color=fff`;

    return res.status(200).json({
      success: true,
      conversation: {
        _id: conversation._id,
        name: fullName,
        type: 'direct',
        avatar,
        role: otherParticipant?.employee?.designation || targetUser.role,
        department: otherParticipant?.employee?.department || 'General',
        isOnline: isUserOnline(targetUser._id.toString()),
        unreadCount: 0,
        lastMessage: conversation.lastMessage,
        otherUser: otherParticipant?.user || targetUser,
        otherEmployee: otherParticipant?.employee || targetUser.employeeProfile,
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get/Create Direct Conversation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate direct message channel',
      error: error.message,
    });
  }
};

/**
 * @desc    Get message history for a conversation
 * @route   GET /api/chat/conversations/:id/messages
 * @access  Protected
 */
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, before } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Check participation unless superadmin
    const isParticipant = conversation.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );

    if (!isParticipant && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view messages in this conversation',
      });
    }

    const query = {
      conversation: id,
      isDeleted: { $ne: true },
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .limit(parseInt(limit, 10))
      .populate('sender', 'name role');

    return res.status(200).json({
      success: true,
      count: messages.length,
      conversationId: id,
      messages,
    });
  } catch (error) {
    console.error('Get Messages Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
      error: error.message,
    });
  }
};

/**
 * @desc    Send a message in a conversation via REST fallback
 * @route   POST /api/chat/conversations/:id/messages
 * @access  Protected
 */
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, attachments = [] } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    if ((!text || !text.trim()) && (!attachments || attachments.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Message must contain text or attachments',
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const avatar =
      req.user.employeeProfile?.avatar ||
      req.user.employeeProfile?.profilePicture ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user.name)}&background=2563eb&color=fff`;

    const role =
      req.user.employeeProfile?.designation ||
      req.user.role ||
      'Team Member';

    const message = new ChatMessage({
      conversation: conversation._id,
      sender: req.user._id,
      senderName: req.user.name,
      senderRole: role,
      senderAvatar: avatar,
      text: (text || '').trim(),
      attachments,
      readBy: [{ user: req.user._id, readAt: new Date() }],
    });

    await message.save();

    // Update conversation lastMessage & increment unread
    conversation.lastMessage = {
      text: message.text || (attachments.length ? `[Attachment: ${attachments[0].name}]` : ''),
      sender: req.user._id,
      senderName: req.user.name,
      createdAt: message.createdAt,
      attachmentsCount: attachments.length,
    };

    conversation.participants.forEach((p) => {
      if (p.user.toString() !== req.user._id.toString()) {
        p.unreadCount = (p.unreadCount || 0) + 1;
      }
    });

    await conversation.save();

    // Broadcast via socket if active
    try {
      const io = getIO();
      if (io) {
        io.to(`conv:${id}`).emit('new_message', {
          conversationId: id,
          message,
        });

        conversation.participants.forEach((p) => {
          io.to(`user:${p.user.toString()}`).emit('conversation_updated', {
            conversationId: id,
            lastMessage: conversation.lastMessage,
            updatedAt: conversation.updatedAt,
            unreadCount: p.unreadCount,
          });
        });
      }
    } catch (socketErr) {
      // Socket might not be initialized during test runs
    }

    return res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Send Message Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

/**
 * @desc    Mark conversation as read for current user
 * @route   PUT /api/chat/conversations/:id/read
 * @access  Protected
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    // Reset unread count on conversation
    await Conversation.updateOne(
      { _id: id, 'participants.user': userId },
      {
        $set: {
          'participants.$.unreadCount': 0,
          'participants.$.lastReadAt': new Date(),
        },
      }
    );

    // Mark messages readBy
    await ChatMessage.updateMany(
      {
        conversation: id,
        'readBy.user': { $ne: userId },
      },
      {
        $push: {
          readBy: { user: userId, readAt: new Date() },
        },
      }
    );

    try {
      const io = getIO();
      if (io) {
        io.to(`conv:${id}`).emit('messages_read', {
          conversationId: id,
          userId: userId.toString(),
          readAt: new Date(),
        });
      }
    } catch (e) {
      // Ignore socket test err
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation marked as read',
    });
  } catch (error) {
    console.error('Mark Read Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark conversation as read',
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new group/department channel
 * @route   POST /api/chat/channels
 * @access  Protected
 */
const createChannel = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required',
      });
    }

    const cleanName = name.trim().replace(/^#+/, '');
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const existing = await Conversation.findOne({
      type: 'channel',
      channelSlug: slug,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Channel '#${cleanName}' already exists`,
      });
    }

    // Add all active users to the channel
    const activeUsers = await User.find({ status: 'active' }).select('_id employeeProfile');

    const participants = activeUsers.map((u) => ({
      user: u._id,
      employee: u.employeeProfile || null,
      role: u._id.toString() === req.user._id.toString() ? 'admin' : 'member',
      joinedAt: new Date(),
      lastReadAt: new Date(),
      unreadCount: 0,
    }));

    const channel = new Conversation({
      name: cleanName,
      channelSlug: slug,
      type: 'channel',
      isChannel: true,
      description: description ? description.trim() : '',
      createdBy: req.user._id,
      participants,
    });

    await channel.save();

    return res.status(201).json({
      success: true,
      channel: {
        _id: channel._id,
        name: `#${channel.name}`,
        channelSlug: channel.channelSlug,
        type: 'channel',
        isChannel: true,
        description: channel.description,
        participantsCount: channel.participants.length,
        unreadCount: 0,
        createdAt: channel.createdAt,
      },
    });
  } catch (error) {
    console.error('Create Channel Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create channel',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all active employees / users for starting new chats
 * @route   GET /api/chat/users
 * @access  Protected
 */
const getChatUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const employees = await Employee.find({
      status: { $ne: 'Terminated' },
      isDeleted: { $ne: true },
    })
      .populate('user', 'role status lastLogin')
      .select('name email designation department phone avatar profilePicture employeeId user');

    const formatted = employees
      .filter((emp) => {
        if (!emp.user) return true;
        return emp.user._id.toString() !== currentUserId.toString();
      })
      .map((emp) => {
        const userId = emp.user ? emp.user._id.toString() : null;
        const online = userId ? isUserOnline(userId) : false;
        const fullName = emp.name;
        const avatar =
          emp.avatar ||
          emp.profilePicture ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2563eb&color=fff`;

        return {
          _id: emp._id,
          employeeId: emp.employeeId,
          userId: userId,
          name: fullName,
          email: emp.email,
          role: emp.designation || (emp.user && emp.user.role) || 'Team Member',
          department: emp.department || 'General',
          avatar,
          isOnline: online,
        };
      });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      users: formatted,
    });
  } catch (error) {
    console.error('Get Chat Users Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve team members',
      error: error.message,
    });
  }
};

module.exports = {
  getConversations,
  getOrCreateDirectConversation,
  getMessages,
  sendMessage,
  markAsRead,
  createChannel,
  getChatUsers,
};
