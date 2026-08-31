const { Project } = require('../models/Project');
const { Employee } = require('../models/Employee');

const defaultProjects = [
  {
    projectId: 'PRJ-101',
    name: 'Enterprise School ERP Platform',
    client: 'Delhi Public School Network',
    category: 'Full-Stack Web & Mobile',
    leadName: 'Priya Sundaram',
    budget: '₹45,00,000',
    startDate: '2025-01-10',
    deadline: '2025-08-30',
    status: 'In Progress',
    progress: 65,
    tags: ['React', 'Node.js', 'PostgreSQL', 'TailwindCSS'],
    description: 'Comprehensive K-12 management system with attendance, fee processing, and mobile apps.',
  },
  {
    projectId: 'PRJ-102',
    name: 'Autonomous Legal Contract Analyzer',
    client: 'Lexis Nexis Global Solutions',
    category: 'GenAI & Multi-Agent',
    leadName: 'Rohan Mehra',
    budget: '₹62,00,000',
    startDate: '2025-02-01',
    deadline: '2025-10-15',
    status: 'Review & QA',
    progress: 88,
    tags: ['Python', 'Qdrant', 'LangChain', 'OpenAI'],
    description: 'Multi-agent legal pipeline for automatic risk discovery and compliance auditing.',
  },
  {
    projectId: 'PRJ-103',
    name: 'Multi-Cloud Kubernetes Automation',
    client: 'FinTech Secure Payments Pvt Ltd',
    category: 'Cloud DevOps',
    leadName: 'Ananya Verma',
    budget: '₹28,00,000',
    startDate: '2025-03-05',
    deadline: '2025-07-20',
    status: 'In Progress',
    progress: 40,
    tags: ['AWS EKS', 'Terraform', 'ArgoCD', 'Prometheus'],
    description: 'Automated CI/CD infrastructure with zero-downtime Canary deployment.',
  },
  {
    projectId: 'PRJ-104',
    name: 'FinTech SOC 2 Compliance Shield',
    client: 'PayEdge India Capital',
    category: 'Cybersecurity',
    leadName: 'Arjun Dasgupta',
    budget: '₹35,00,000',
    startDate: '2024-11-01',
    deadline: '2025-04-10',
    status: 'Completed',
    progress: 100,
    tags: ['WAF', 'SIEM', 'ISO 27001', 'Penetration Testing'],
    description: 'Security auditing, threat mitigation, and automated compliance reporting.',
  },
];

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

    let projects = await Project.find(query).populate('lead', 'firstName lastName designation department email employeeId').sort({ createdAt: -1 });

    // Seed defaults if clean DB
    if (projects.length === 0 && (!status || status === 'All') && (!category || category === 'All') && !search) {
      const count = await Project.countDocuments();
      if (count === 0) {
        await Project.insertMany(defaultProjects);
        projects = await Project.find().populate('lead', 'firstName lastName designation department email employeeId').sort({ createdAt: -1 });
      }
    }

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
    if (lead) {
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
      lead: lead || null,
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
      const emp = await Employee.findById(req.body.lead);
      if (emp) {
        req.body.leadName = `${emp.firstName} ${emp.lastName}`.trim();
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
