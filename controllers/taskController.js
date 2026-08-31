const { Task } = require('../models/Task');
const { Project } = require('../models/Project');
const { Employee } = require('../models/Employee');

const defaultTasks = [
  {
    taskId: 'TSK-101',
    title: 'Setup PostgreSQL Multi-Region Database Replica',
    projectName: 'Enterprise School ERP Platform',
    assigneeName: 'Priya Sundaram',
    priority: 'Urgent',
    status: 'In Progress',
    deadline: '2025-06-15',
    estimatedHours: 16,
    description: 'Configure high availability database failover with read replicas.',
  },
  {
    taskId: 'TSK-102',
    title: 'Implement Vector Indexing Pipeline for Legal Documents',
    projectName: 'Autonomous Legal Contract Analyzer',
    assigneeName: 'Rohan Mehra',
    priority: 'High',
    status: 'To Do',
    deadline: '2025-06-20',
    estimatedHours: 24,
    description: 'Connect LangChain embeddings to Qdrant vector database.',
  },
  {
    taskId: 'TSK-103',
    title: 'Deploy EKS Autoscaling Worker Nodes with Karpenter',
    projectName: 'Multi-Cloud Kubernetes Automation',
    assigneeName: 'Ananya Verma',
    priority: 'Urgent',
    status: 'Review',
    deadline: '2025-06-10',
    estimatedHours: 12,
    description: 'Tune node provisioning latency under burst loads.',
  },
  {
    taskId: 'TSK-104',
    title: 'Audit ISO 27001 Access Control Matrix',
    projectName: 'FinTech SOC 2 Compliance Shield',
    assigneeName: 'Arjun Dasgupta',
    priority: 'Medium',
    status: 'Done',
    deadline: '2025-05-30',
    estimatedHours: 8,
    description: 'Review and verify role permissions for all production servers.',
  },
];

/**
 * @desc    Get all tasks with filtering by priority, status, project, assignee
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = async (req, res) => {
  try {
    const { priority, status, project, assignee, search } = req.query;
    let query = {};

    if (priority && priority !== 'All') {
      query.priority = priority;
    }
    if (status && status !== 'All') {
      query.status = status;
    }
    if (project) {
      query.project = project;
    }
    if (assignee) {
      query.assignee = assignee;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { taskId: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
        { assigneeName: { $regex: search, $options: 'i' } },
      ];
    }

    let tasks = await Task.find(query)
      .populate('project', 'name projectId client')
      .populate('assignee', 'firstName lastName designation department email employeeId')
      .sort({ createdAt: -1 });

    // Seed defaults if clean DB
    if (tasks.length === 0 && (!priority || priority === 'All') && (!status || status === 'All') && !search && !project && !assignee) {
      const count = await Task.countDocuments();
      if (count === 0) {
        await Task.insertMany(defaultTasks);
        tasks = await Task.find()
          .populate('project', 'name projectId client')
          .populate('assignee', 'firstName lastName designation department email employeeId')
          .sort({ createdAt: -1 });
      }
    }

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Get single task details
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name projectId client')
      .populate('assignee', 'firstName lastName designation department email employeeId');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    console.error('Error fetching task by id:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Create new sprint task
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = async (req, res) => {
  try {
    const { title, description, project, projectName, assignee, assigneeName, priority, status, deadline, estimatedHours } = req.body;

    if (!title || !deadline) {
      return res.status(400).json({ success: false, message: 'Task title and due date are required' });
    }

    let resolvedProjectName = projectName || 'General Project';
    if (project) {
      const proj = await Project.findById(project);
      if (proj) {
        resolvedProjectName = proj.name;
      }
    }

    let resolvedAssigneeName = assigneeName || 'Unassigned';
    if (assignee) {
      const emp = await Employee.findById(assignee);
      if (emp) {
        resolvedAssigneeName = `${emp.firstName} ${emp.lastName}`.trim();
      }
    }

    const randomNum = Math.floor(100 + Math.random() * 900);
    const taskId = req.body.taskId || `TSK-${randomNum}`;

    const task = await Task.create({
      taskId,
      title,
      description: description || '',
      project: project || null,
      projectName: resolvedProjectName,
      assignee: assignee || null,
      assigneeName: resolvedAssigneeName,
      priority: priority || 'Medium',
      status: status || 'To Do',
      deadline,
      estimatedHours: estimatedHours || 8,
      createdBy: req.user ? req.user._id : null,
    });

    const populated = await Task.findById(task._id)
      .populate('project', 'name projectId client')
      .populate('assignee', 'firstName lastName designation department email employeeId');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populated,
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Update task details
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (req.body.project) {
      const proj = await Project.findById(req.body.project);
      if (proj) {
        req.body.projectName = proj.name;
      }
    }

    if (req.body.assignee) {
      const emp = await Employee.findById(req.body.assignee);
      if (emp) {
        req.body.assigneeName = `${emp.firstName} ${emp.lastName}`.trim();
      }
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('project', 'name projectId client')
      .populate('assignee', 'firstName lastName designation department email employeeId');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Advance or change task status (Kanban drag / click action)
 * @route   PATCH /api/tasks/:id/status
 * @access  Private
 */
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = status;
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('project', 'name projectId client')
      .populate('assignee', 'firstName lastName designation department email employeeId');

    res.status(200).json({
      success: true,
      message: 'Task status updated',
      data: populated,
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
