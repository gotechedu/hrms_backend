const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Blog category is required'],
      default: 'Technology',
    },
    date: {
      type: String,
      default: () =>
        new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    },
    readTime: {
      type: String,
      default: '5 min read',
    },
    coverImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80',
    },
    author: {
      name: { type: String, default: 'Dr. Vikram Sharma' },
      role: { type: String, default: 'Head of AI Research' },
      initials: { type: String, default: 'VS' },
      avatarBg: { type: String, default: 'bg-blue-600' },
    },
    badge: {
      type: String,
      default: 'Featured Insight',
    },
    description: {
      type: String,
      required: [true, 'Short excerpt / description is required'],
    },
    content: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Published', 'Draft', 'Archived'],
      default: 'Published',
    },
    views: {
      type: Number,
      default: 120,
    },
  },
  {
    timestamps: true,
  }
);

blogSchema.pre('save', async function () {
  if (!this.slug && this.title) {
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    
    // Check if baseSlug exists
    const existing = await mongoose.models.Blog.findOne({ slug: baseSlug, _id: { $ne: this._id } });
    if (existing) {
      this.slug = `${baseSlug}-${Date.now().toString(36)}`;
    } else {
      this.slug = baseSlug;
    }
  }
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = { Blog };
