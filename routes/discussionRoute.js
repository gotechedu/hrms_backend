const express = require('express');
const router = express.Router();
const {
  getDiscussions,
  getDiscussionById,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  addReply,
  toggleLikeDiscussion,
  getDiscussionStats,
} = require('../controllers/discussionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getDiscussionStats);
router.get('/', protect, getDiscussions);
router.post('/', protect, createDiscussion);
router.get('/:id', protect, getDiscussionById);
router.put('/:id', protect, updateDiscussion);
router.delete('/:id', protect, deleteDiscussion);
router.post('/:id/replies', protect, addReply);
router.post('/:id/like', protect, toggleLikeDiscussion);

module.exports = router;
