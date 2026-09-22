const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getConversations,
  getOrCreateDirectConversation,
  getMessages,
  sendMessage,
  markAsRead,
  createChannel,
  getChatUsers,
} = require('../controllers/chatController');

// All chat routes are protected
router.use(protect);

router.get('/conversations', getConversations);
router.post('/direct', getOrCreateDirectConversation);
router.post('/channels', createChannel);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.put('/conversations/:id/read', markAsRead);
router.get('/users', getChatUsers);

module.exports = router;
