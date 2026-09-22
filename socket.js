const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('./models/User');
const { Conversation } = require('./models/Conversation');
const { ChatMessage } = require('./models/ChatMessage');

let io = null;

// Map<userIdString, Set<socketId>> to track multiple tabs/devices per user
const onlineUsers = new Map();

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

const isUserOnline = (userId) => {
  if (!userId) return false;
  return onlineUsers.has(userId.toString());
};

/**
 * Initialize Socket.io server with authentication and event listeners
 */
const initSocket = (server) => {
  if (io) {
    if (server) {
      try {
        io.attach(server);
      } catch (e) {
        // server might already be attached
      }
    }
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin or any dev / vercel origin
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/+$/, '');
        if (
          cleanOrigin.includes('localhost') ||
          cleanOrigin.includes('127.0.0.1') ||
          cleanOrigin.endsWith('.vercel.app') ||
          cleanOrigin.includes('gotechedu.com')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication Middleware for incoming socket connections
  io.use(async (socket, next) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization;

      if (!token) {
        return next(new Error('Authentication token required for Socket.IO'));
      }

      if (token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'gotech_hrms_super_secret_jwt_key_2026_secure'
      );

      const user = await User.findById(decoded.id)
        .select('-password')
        .populate('employeeProfile');

      if (!user) {
        return next(new Error('User account not found'));
      }

      if (user.status !== 'active') {
        return next(new Error(`Account status is ${user.status}`));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('[Socket Auth Error]:', err.message);
      next(new Error('Invalid or expired token'));
    }
  });

  // Socket Connection Lifecycle
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // 1. Manage user presence
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Send initial active users list to the newly connected user
    socket.emit('online_users_list', getOnlineUserIds());

    // Broadcast user online event to all clients
    io.emit('user_status_change', {
      userId,
      status: 'online',
      timestamp: new Date(),
    });

    console.log(
      `🟢 [Socket Connected] User: ${socket.user.name} (${userId}) | Socket: ${socket.id} | Total Online: ${onlineUsers.size}`
    );

    // 2. Join a Conversation Room
    socket.on('join_conversation', (conversationId) => {
      if (!conversationId) return;
      socket.join(`conv:${conversationId}`);
    });

    // 3. Leave a Conversation Room
    socket.on('leave_conversation', (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conv:${conversationId}`);
    });

    // 4. Send Message via Socket
    socket.on('send_message', async (data, ackCallback) => {
      try {
        const { conversationId, text, attachments = [] } = data;

        if (!conversationId) {
          if (ackCallback) ackCallback({ success: false, error: 'Missing conversationId' });
          return;
        }

        if ((!text || !text.trim()) && (!attachments || attachments.length === 0)) {
          if (ackCallback) ackCallback({ success: false, error: 'Cannot send an empty message' });
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          if (ackCallback) ackCallback({ success: false, error: 'Conversation not found' });
          return;
        }

        // Determine user avatar and role
        const avatar =
          socket.user.employeeProfile?.avatar ||
          socket.user.employeeProfile?.profilePicture ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(socket.user.name)}&background=2563eb&color=fff`;

        const role =
          socket.user.employeeProfile?.designation ||
          socket.user.role ||
          'Team Member';

        // Persist message
        const message = new ChatMessage({
          conversation: conversation._id,
          sender: socket.user._id,
          senderName: socket.user.name,
          senderRole: role,
          senderAvatar: avatar,
          text: (text || '').trim(),
          attachments: attachments || [],
          readBy: [{ user: socket.user._id, readAt: new Date() }],
        });

        await message.save();

        // Update conversation lastMessage & increment unread for other participants
        conversation.lastMessage = {
          text: message.text || (attachments.length ? `[Attachment: ${attachments[0].name}]` : ''),
          sender: socket.user._id,
          senderName: socket.user.name,
          createdAt: message.createdAt,
          attachmentsCount: attachments.length,
        };

        // Increment unread count for other participants
        if (Array.isArray(conversation.participants)) {
          conversation.participants.forEach((p) => {
            if (p.user.toString() !== userId) {
              p.unreadCount = (p.unreadCount || 0) + 1;
            }
          });
        }

        await conversation.save();

        // Broadcast to conversation room
        io.to(`conv:${conversationId}`).emit('new_message', {
          conversationId,
          message,
        });

        // Broadcast conversation update to participants' personal rooms
        if (Array.isArray(conversation.participants)) {
          conversation.participants.forEach((p) => {
            const pUserId = p.user.toString();
            io.to(`user:${pUserId}`).emit('conversation_updated', {
              conversationId,
              lastMessage: conversation.lastMessage,
              updatedAt: conversation.updatedAt,
              unreadCount: p.unreadCount,
            });
          });
        }

        if (ackCallback) ackCallback({ success: true, message });
      } catch (err) {
        console.error('[Socket send_message Error]:', err);
        if (ackCallback) ackCallback({ success: false, error: err.message });
      }
    });

    // 5. Typing Indicator
    socket.on('typing', ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        userName: socket.user.name,
        isTyping: !!isTyping,
      });
    });

    // 6. Mark Conversation Read
    socket.on('mark_read', async ({ conversationId }, ackCallback) => {
      try {
        if (!conversationId) return;

        // Update readBy on recent unread messages
        await ChatMessage.updateMany(
          {
            conversation: conversationId,
            'readBy.user': { $ne: socket.user._id },
          },
          {
            $push: {
              readBy: { user: socket.user._id, readAt: new Date() },
            },
          }
        );

        // Reset user's unread counter on conversation
        await Conversation.updateOne(
          { _id: conversationId, 'participants.user': socket.user._id },
          {
            $set: {
              'participants.$.unreadCount': 0,
              'participants.$.lastReadAt': new Date(),
            },
          }
        );

        // Notify other participants that messages were read
        socket.to(`conv:${conversationId}`).emit('messages_read', {
          conversationId,
          userId,
          readAt: new Date(),
        });

        // Notify user's other sessions/tabs
        socket.emit('conversation_read', { conversationId });

        if (ackCallback) ackCallback({ success: true });
      } catch (err) {
        console.error('[Socket mark_read Error]:', err);
        if (ackCallback) ackCallback({ success: false, error: err.message });
      }
    });

    // 7. Disconnect Handler
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast offline event
          io.emit('user_status_change', {
            userId,
            status: 'offline',
            timestamp: new Date(),
          });
        }
      }

      console.log(
        `🔴 [Socket Disconnected] User: ${socket.user.name} (${userId}) | Socket: ${socket.id} | Total Online: ${onlineUsers.size}`
      );
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet.');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
  getOnlineUserIds,
  isUserOnline,
};
