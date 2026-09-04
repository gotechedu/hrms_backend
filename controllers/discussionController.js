const { Discussion } = require('../models/Discussion');

/**
 * @desc    Get all discussions with filters, search, and pagination
 * @route   GET /api/discussions
 * @access  Private / Public
 */
const getDiscussions = async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 20 } = req.query;
    const query = { isDeleted: false };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [discussions, total] = await Promise.all([
      Discussion.find(query)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Discussion.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: discussions.length,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      data: discussions,
    });
  } catch (error) {
    console.error('Error fetching discussions:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get single discussion by ID (increments views)
 * @route   GET /api/discussions/:id
 * @access  Private
 */
const getDiscussionById = async (req, res) => {
  try {
    const discussion = await Discussion.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion thread not found' });
    }

    res.status(200).json({
      success: true,
      data: discussion,
    });
  } catch (error) {
    console.error('Error fetching discussion:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Create new discussion thread
 * @route   POST /api/discussions
 * @access  Private
 */
const createDiscussion = async (req, res) => {
  try {
    const { title, content, category, tags, isPinned } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const authorName = req.user?.name || req.body.authorName || 'Team Member';
    const authorAvatar =
      req.user?.employeeProfile?.avatar ||
      req.user?.avatar ||
      req.body.authorAvatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authorName)}`;
    const authorRole = req.user?.role || req.body.authorRole || 'Team Member';

    const discussion = await Discussion.create({
      title: title.trim(),
      content: content.trim(),
      category: category || 'General',
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : [],
      author: req.user ? req.user._id : null,
      authorName,
      authorAvatar,
      authorRole,
      isPinned: Boolean(isPinned),
      status: 'Open',
    });

    res.status(201).json({
      success: true,
      message: 'Discussion topic created successfully',
      data: discussion,
    });
  } catch (error) {
    console.error('Error creating discussion:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update discussion thread
 * @route   PUT /api/discussions/:id
 * @access  Private
 */
const updateDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findOne({ _id: req.params.id, isDeleted: false });

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion thread not found' });
    }

    const { title, content, category, tags, status, isPinned } = req.body;

    if (title) discussion.title = title.trim();
    if (content) discussion.content = content.trim();
    if (category) discussion.category = category;
    if (tags) {
      discussion.tags = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : [];
    }
    if (status) discussion.status = status;
    if (typeof isPinned === 'boolean') discussion.isPinned = isPinned;

    await discussion.save();

    res.status(200).json({
      success: true,
      message: 'Discussion updated successfully',
      data: discussion,
    });
  } catch (error) {
    console.error('Error updating discussion:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Soft delete discussion thread
 * @route   DELETE /api/discussions/:id
 * @access  Private
 */
const deleteDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion thread not found' });
    }

    discussion.isDeleted = true;
    discussion.deletedAt = new Date();
    await discussion.save();

    res.status(200).json({
      success: true,
      message: 'Discussion moved to recycle bin',
      id: req.params.id,
    });
  } catch (error) {
    console.error('Error deleting discussion:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Add reply / response to discussion thread
 * @route   POST /api/discussions/:id/replies
 * @access  Private
 */
const addReply = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Reply content cannot be empty' });
    }

    const discussion = await Discussion.findOne({ _id: req.params.id, isDeleted: false });

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion thread not found' });
    }

    const authorName = req.user?.name || req.body.authorName || 'Team Member';
    const authorAvatar =
      req.user?.employeeProfile?.avatar ||
      req.user?.avatar ||
      req.body.authorAvatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authorName)}`;
    const authorRole = req.user?.role || req.body.authorRole || 'Staff Member';

    const newReply = {
      author: req.user ? req.user._id : null,
      authorName,
      authorAvatar,
      authorRole,
      content: content.trim(),
      likes: [],
      createdAt: new Date(),
    };

    discussion.replies.push(newReply);
    await discussion.save();

    res.status(201).json({
      success: true,
      message: 'Reply posted successfully',
      data: discussion,
      reply: discussion.replies[discussion.replies.length - 1],
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Toggle like on discussion thread
 * @route   POST /api/discussions/:id/like
 * @access  Private
 */
const toggleLikeDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findOne({ _id: req.params.id, isDeleted: false });

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion thread not found' });
    }

    const userId = req.user ? req.user._id : null;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required to like' });
    }

    const hasLiked = discussion.likes.some((l) => l.toString() === userId.toString());

    if (hasLiked) {
      discussion.likes = discussion.likes.filter((l) => l.toString() !== userId.toString());
    } else {
      discussion.likes.push(userId);
    }

    await discussion.save();

    res.status(200).json({
      success: true,
      liked: !hasLiked,
      likesCount: discussion.likes.length,
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get discussion KPI stats
 * @route   GET /api/discussions/stats
 * @access  Private
 */
const getDiscussionStats = async (req, res) => {
  try {
    const [total, openCount, resolvedCount, allDiscussions] = await Promise.all([
      Discussion.countDocuments({ isDeleted: false }),
      Discussion.countDocuments({ isDeleted: false, status: 'Open' }),
      Discussion.countDocuments({ isDeleted: false, status: 'Resolved' }),
      Discussion.find({ isDeleted: false }).select('replies'),
    ]);

    const totalReplies = allDiscussions.reduce((sum, d) => sum + (d.replies ? d.replies.length : 0), 0);

    res.status(200).json({
      success: true,
      stats: {
        total,
        open: openCount,
        resolved: resolvedCount,
        totalReplies,
      },
    });
  } catch (error) {
    console.error('Error fetching discussion stats:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDiscussions,
  getDiscussionById,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  addReply,
  toggleLikeDiscussion,
  getDiscussionStats,
};
