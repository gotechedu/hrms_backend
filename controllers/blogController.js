const { Blog } = require('../models/Blog');

// GET /api/blogs
const getAllBlogs = async (req, res) => {
  try {
    const { category, search, status } = req.query;
    const query = { isDeleted: { $ne: true } };

    if (category && category !== 'All') {
      query.category = category;
    }
    if (status && status !== 'All') {
      query.status = status;
    }
    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    const blogs = await Blog.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: blogs.length,
      blogs,
    });
  } catch (error) {
    console.error('Get All Blogs Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving blogs',
      error: error.message,
    });
  }
};

// GET /api/blogs/:slugOrId
const getBlogBySlugOrId = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    let blog;
    if (slugOrId.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(slugOrId);
    } else {
      blog = await Blog.findOne({ slug: slugOrId });
    }

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog article not found',
      });
    }

    // Increment view count
    blog.views = (blog.views || 0) + 1;
    await blog.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      blog,
    });
  } catch (error) {
    console.error('Get Blog Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving blog post',
      error: error.message,
    });
  }
};

// POST /api/blogs
const createBlog = async (req, res) => {
  try {
    const { title, category, readTime, coverImage, author, badge, description, content, tags, status } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Blog title and description are required',
      });
    }

    const blog = new Blog({
      title,
      category: category || 'Technology',
      readTime: readTime || '5 min read',
      coverImage: coverImage || 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80',
      author: author || {
        name: req.user?.name || 'Editorial Team',
        role: req.user?.role?.toUpperCase() || 'Tech Author',
        initials: (req.user?.name || 'ET').split(' ').map(n => n[0]).join('').substring(0, 2),
        avatarBg: 'bg-blue-600',
      },
      badge: badge || 'Featured Insight',
      description,
      content: content || description,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map(s => s.trim()) : [],
      status: status || 'Published',
    });

    await blog.save();

    return res.status(201).json({
      success: true,
      message: 'Blog insight published successfully and synced to official portal',
      blog,
    });
  } catch (error) {
    console.error('Create Blog Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating blog post',
      error: error.message,
    });
  }
};

// PUT /api/blogs/:id
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(s => s.trim());
    }

    const blog = await Blog.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog article not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Blog article updated successfully',
      blog,
    });
  } catch (error) {
    console.error('Update Blog Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating blog article',
      error: error.message,
    });
  }
};

// DELETE /api/blogs/:id
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog article not found',
      });
    }

    blog.isDeleted = true;
    blog.deletedAt = new Date();
    await blog.save();

    return res.status(200).json({
      success: true,
      message: `Blog article '${blog.title}' moved to Recycle Bin`,
    });
  } catch (error) {
    console.error('Delete Blog Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting blog article',
      error: error.message,
    });
  }
};

module.exports = {
  getAllBlogs,
  getBlogBySlugOrId,
  createBlog,
  updateBlog,
  deleteBlog,
};
