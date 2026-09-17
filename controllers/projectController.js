const mongoose = require('mongoose');
const { Project } = require('../models/Project');
const { Employee } = require('../models/Employee');

/**
 * @desc    Get all projects with filtering and search
 * @route   GET /api/projects
 * @access  Private
 */
const getProjects = async (req, res) => {
  try {
    const { status, category, search } = req.query;
    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }
    if (category && category !== 'All') {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { client: { $regex: search, $options: 'i' } },
        { projectId: { $regex: search, $options: 'i' } },
      ];
    }

    const projects = await Project.find(query).populate('lead', 'firstName lastName designation department email employeeId').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Get project details by ID
 * @route   GET /api/projects/:id
 * @access  Private
 */
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('lead', 'firstName lastName designation department email employeeId');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    console.error('Error fetching project by id:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Create new project
 * @route   POST /api/projects
 * @access  Private (Admin / Manager)
 */
const createProject = async (req, res) => {
  try {
    const { name, client, category, lead, leadName, budget, startDate, deadline, tags, description } = req.body;

    if (!name || !client || !deadline) {
      return res.status(400).json({ success: false, message: 'Project name, client, and target deadline are required' });
    }

    let resolvedLeadName = leadName || '';
    if (lead && mongoose.Types.ObjectId.isValid(lead)) {
      const emp = await Employee.findById(lead);
      if (emp) {
        resolvedLeadName = `${emp.firstName} ${emp.lastName}`.trim();
      }
    }

    const randomNum = Math.floor(100 + Math.random() * 900);
    const projectId = req.body.projectId || `PRJ-${randomNum}`;

    const project = await Project.create({
      projectId,
      name,
      client,
      category: category || 'Full-Stack Web & Mobile',
      lead: (lead && mongoose.Types.ObjectId.isValid(lead)) ? lead : null,
      leadName: resolvedLeadName,
      budget: budget || '₹0',
      startDate: startDate || new Date().toISOString().split('T')[0],
      deadline,
      status: 'In Progress',
      progress: 0,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      description: description || '',
      createdBy: req.user ? req.user._id : null,
    });

    const populated = await Project.findById(project._id).populate('lead', 'firstName lastName designation department email employeeId');

    res.status(201).json({
      success: true,
      message: 'Project initialized successfully',
      data: populated,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Update project details
 * @route   PUT /api/projects/:id
 * @access  Private
 */
const updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.body.lead) {
      if (mongoose.Types.ObjectId.isValid(req.body.lead)) {
        const emp = await Employee.findById(req.body.lead);
        if (emp) {
          req.body.leadName = `${emp.firstName} ${emp.lastName}`.trim();
        }
      } else {
        req.body.lead = null;
      }
    }

    if (typeof req.body.tags === 'string') {
      req.body.tags = req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('lead', 'firstName lastName designation department email employeeId');

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Update project progress / milestone completion
 * @route   PATCH /api/projects/:id/progress
 * @access  Private
 */
const updateProjectProgress = async (req, res) => {
  try {
    const { progress, status } = req.body;
    let project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (progress !== undefined) {
      project.progress = Math.min(100, Math.max(0, Number(progress)));
      if (project.progress === 100) {
        project.status = 'Completed';
      }
    }

    if (status) {
      project.status = status;
    }

    await project.save();
    const populated = await Project.findById(project._id).populate('lead', 'firstName lastName designation department email employeeId');

    res.status(200).json({
      success: true,
      message: 'Project progress updated',
      data: populated,
    });
  } catch (error) {
    console.error('Error updating project progress:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Delete project
 * @route   DELETE /api/projects/:id
 * @access  Private (Admin)
 */
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const canDelete =
      req.user.isSuperAdmin ||
      req.user.hasPermission('delete_project') ||
      req.user.hasPermission('manage_project') ||
      req.user.can('delete', 'project') ||
      req.user.can('manage', 'project');

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role '${req.user.role}' lacks permission to delete projects.`,
      });
    }

    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Project removed successfully',
      id: req.params.id,
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  updateProjectProgress,
  deleteProject,
};
