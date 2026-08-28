const { Employee } = require('../models/Employee');
const { Job } = require('../models/Job');
const { JobApplication } = require('../models/JobApplication');
const { Course } = require('../models/Course');
const { CourseApplication } = require('../models/CourseApplication');
const { Payroll } = require('../models/Payroll');
const { Blog } = require('../models/Blog');

const MODEL_MAP = {
  employee: { model: Employee, titleField: 'name', subField: 'email', typeLabel: 'Employee Profile' },
  job: { model: Job, titleField: 'title', subField: 'department', typeLabel: 'Career Posting' },
  jobApplication: { model: JobApplication, titleField: 'name', subField: 'jobTitle', typeLabel: 'Job Candidate' },
  course: { model: Course, titleField: 'title', subField: 'category', typeLabel: 'Course' },
  courseApplication: { model: CourseApplication, titleField: 'studentName', subField: 'courseTitle', typeLabel: 'Course Candidate' },
  payroll: { model: Payroll, titleField: 'recipientName', subField: 'month', typeLabel: 'Payroll Record' },
  blog: { model: Blog, titleField: 'title', subField: 'category', typeLabel: 'Bulletin / Blog' },
};

/**
 * GET /api/recycle-bin
 * Fetch all soft-deleted records across HRMS
 */
const getDeletedItems = async (req, res) => {
  try {
    const { type, search } = req.query;
    let items = [];

    const typesToQuery = type && type !== 'All' && MODEL_MAP[type]
      ? [type]
      : Object.keys(MODEL_MAP);

    for (const key of typesToQuery) {
      const config = MODEL_MAP[key];
      const records = await config.model
        .find({ isDeleted: true })
        .sort({ deletedAt: -1, updatedAt: -1 })
        .lean();

      records.forEach((doc) => {
        items.push({
          _id: doc._id,
          entityType: key,
          typeLabel: config.typeLabel,
          title: doc[config.titleField] || 'Untitled Record',
          subtitle: doc[config.subField] || '',
          deletedAt: doc.deletedAt || doc.updatedAt || new Date(),
          originalData: doc,
        });
      });
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.subtitle.toLowerCase().includes(q) ||
          it.typeLabel.toLowerCase().includes(q)
      );
    }

    // Sort by deletedAt desc
    items.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    return res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error('[RecycleBin Controller] getDeletedItems Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recycle bin items',
      error: error.message,
    });
  }
};

/**
 * POST /api/recycle-bin/restore/:type/:id
 * Restore soft-deleted item
 */
const restoreItem = async (req, res) => {
  try {
    const { type, id } = req.params;
    const config = MODEL_MAP[type];
    if (!config) {
      return res.status(400).json({ success: false, message: `Invalid entity type '${type}'` });
    }

    const item = await config.model.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in Recycle Bin' });
    }

    item.isDeleted = false;
    item.deletedAt = null;
    await item.save();

    return res.status(200).json({
      success: true,
      message: `Successfully restored ${config.typeLabel}: ${item[config.titleField] || ''}`,
    });
  } catch (error) {
    console.error('[RecycleBin Controller] restoreItem Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to restore item',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/recycle-bin/permanent/:type/:id
 * Permanently delete item
 */
const permanentDeleteItem = async (req, res) => {
  try {
    const { type, id } = req.params;
    const config = MODEL_MAP[type];
    if (!config) {
      return res.status(400).json({ success: false, message: `Invalid entity type '${type}'` });
    }

    const item = await config.model.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found to delete' });
    }

    return res.status(200).json({
      success: true,
      message: `Permanently deleted ${config.typeLabel}`,
    });
  } catch (error) {
    console.error('[RecycleBin Controller] permanentDeleteItem Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to permanently delete item',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/recycle-bin/empty
 * Permanently purge all items currently in recycle bin
 */
const emptyRecycleBin = async (req, res) => {
  try {
    let deletedCounts = 0;
    for (const key of Object.keys(MODEL_MAP)) {
      const config = MODEL_MAP[key];
      const result = await config.model.deleteMany({ isDeleted: true });
      deletedCounts += result.deletedCount || 0;
    }

    return res.status(200).json({
      success: true,
      message: `Recycle bin emptied successfully. ${deletedCounts} items permanently purged.`,
      purgedCount: deletedCounts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to empty recycle bin',
      error: error.message,
    });
  }
};

module.exports = {
  getDeletedItems,
  restoreItem,
  permanentDeleteItem,
  emptyRecycleBin,
};
