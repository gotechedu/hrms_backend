const { Job } = require('../models/Job');

// GET /api/jobs
const getAllJobs = async (req, res) => {
  try {
    const { department, status, type, search } = req.query;
    const query = { isDeleted: { $ne: true } };

    if (department && department !== 'All') {
      query.department = department;
    }
    if (status && status !== 'All') {
      query.status = status;
    }
    if (type && type !== 'All') {
      query.type = type;
    }
    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    const jobs = await Job.find(query)
      .select('-isDeleted -deletedAt -__v -notes')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error('Get All Jobs Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving job postings',
    });
  }
};

// GET /api/jobs/:id
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    let job;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      job = await Job.findById(id).select('-isDeleted -deletedAt -__v -notes');
    } else {
      job = await Job.findOne({ slug: id }).select('-isDeleted -deletedAt -__v -notes');
    }

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found',
      });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error('Get Job By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving job details',
      error: error.message,
    });
  }
};

// POST /api/jobs
const createJob = async (req, res) => {
  try {
    const { title, department, type, location, experience, salary, tags, description, requirements, responsibilities, status } = req.body;

    if (!title || !department || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title, department, and description are required',
      });
    }

    const job = new Job({
      title,
      department,
      type: type || 'Full-Time',
      location: location || 'Gurugram, HQ / Remote',
      experience: experience || '2–4 Years',
      salary: salary || '₹12L – ₹20L PA',
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map(s => s.trim()) : [],
      description,
      requirements: Array.isArray(requirements) ? requirements : typeof requirements === 'string' ? requirements.split('\n').map(s => s.trim()).filter(Boolean) : [],
      responsibilities: Array.isArray(responsibilities) ? responsibilities : typeof responsibilities === 'string' ? responsibilities.split('\n').map(s => s.trim()).filter(Boolean) : [],
      status: status || 'Active',
    });

    await job.save();

    return res.status(201).json({
      success: true,
      message: 'Career job opening posted successfully to official portal',
      job,
    });
  } catch (error) {
    console.error('Create Job Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating job opening',
      error: error.message,
    });
  }
};

// PUT /api/jobs/:id
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(s => s.trim());
    }
    if (typeof updateData.requirements === 'string') {
      updateData.requirements = updateData.requirements.split('\n').map(s => s.trim()).filter(Boolean);
    }
    if (typeof updateData.responsibilities === 'string') {
      updateData.responsibilities = updateData.responsibilities.split('\n').map(s => s.trim()).filter(Boolean);
    }

    const job = await Job.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Job opening updated successfully',
      job,
    });
  } catch (error) {
    console.error('Update Job Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating job opening',
      error: error.message,
    });
  }
};

// DELETE /api/jobs/:id
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found',
      });
    }

    job.isDeleted = true;
    job.deletedAt = new Date();
    await job.save();

    return res.status(200).json({
      success: true,
      message: `Job opening '${job.title}' moved to Recycle Bin`,
    });
  } catch (error) {
    console.error('Delete Job Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting job posting',
      error: error.message,
    });
  }
};

module.exports = {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
};
