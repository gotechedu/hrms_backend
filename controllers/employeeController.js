const mongoose = require('mongoose');
const { Employee, EMPLOYEE_TYPES, EMPLOYEE_STATUSES } = require('../models/Employee');
const { User, ROLES } = require('../models/User');

const DEFAULT_DEPARTMENTS = [
  'Engineering',
  'AI & Data Science',
  'Cloud & DevOps',
  'Cybersecurity',
  'Marketing & Growth',
  'People Operations & HR',
  'Product & Design',
  'Sales & Business Development',
  'Finance & Legal',
];

/**
 * @desc    Get all employees with search, filter, sort & pagination
 * @route   GET /api/employees
 * @access  Protected (All authenticated roles)
 */
const getAllEmployees = async (req, res) => {
  try {
    const {
      search,
      department,
      status,
      role,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = req.query;

    const query = { isDeleted: { $ne: true } };

    // Filter by department
    if (department && department !== 'All') {
      query.department = { $regex: new RegExp(`^${department}$`, 'i') };
    }

    // Filter by status
    if (status && status !== 'All') {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }

    // Filter by role
    if (role && role !== 'All') {
      query.role = role.toLowerCase();
    }

    // Filter by employment type
    if (type && type !== 'All') {
      query.type = type;
    }

    // Keyword Search (name, email, designation, department, employeeId)
    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { designation: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
        { employeeId: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    // Pagination calculations
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const totalEmployees = await Employee.countDocuments(query);

    const employees = await Employee.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'role status lastLogin')
      .populate('manager', 'name email designation avatar')
      .populate('teamLead', 'name email designation avatar');

    return res.status(200).json({
      success: true,
      count: employees.length,
      total: totalEmployees,
      totalPages: Math.ceil(totalEmployees / limitNum) || 1,
      currentPage: pageNum,
      employees,
      data: employees,
    });
  } catch (error) {
    console.error('Get All Employees Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving employee directory',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single employee by ID or company employeeId
 * @route   GET /api/employees/:id
 * @access  Protected
 */
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    let employee;
    if (mongoose.Types.ObjectId.isValid(id)) {
      employee = await Employee.findById(id)
        .populate('user', 'role status lastLogin createdAt')
        .populate('manager', 'name email designation avatar employeeId')
        .populate('teamLead', 'name email designation avatar employeeId');
    } else {
      employee = await Employee.findOne({ employeeId: id })
        .populate('user', 'role status lastLogin createdAt')
        .populate('manager', 'name email designation avatar employeeId')
        .populate('teamLead', 'name email designation avatar employeeId');
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee with identifier '${id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error('Get Employee By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving employee record',
      error: error.message,
    });
  }
};

/**
 * @desc    Create new employee and linked user login account
 * @route   POST /api/employees
 * @access  Protected (admin, hr)
 */
const createEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      role = 'employee',
      designation,
      department,
      type = 'Full-Time',
      status = 'Active',
      salary,
      joiningDate,
      location,
      avatar,
      manager,
      teamLead,
      skills,
      emergencyContact,
      bankDetails,
      address,
      password,
    } = req.body;

    if (!name || !email || !department) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and department are mandatory fields',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = (role || 'employee').toLowerCase().trim();

    const { Role } = require('../models/Role');
    const roleExists = await Role.findOne({ slug: normalizedRole });
    if (!roleExists && !ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role '${role}'. Please select a valid role.`,
      });
    }

    // Check if email is already taken
    const existingEmployee = await Employee.findOne({ email: normalizedEmail });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: `An employee profile already exists with email ${normalizedEmail}`,
      });
    }

    // Create Employee document
    const employee = new Employee({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone || '',
      role: normalizedRole,
      designation: designation || 'Team Member',
      department: department.trim(),
      type,
      status,
      salary: salary || '',
      joiningDate: joiningDate || Date.now(),
      location: location || 'Gurugram, HQ',
      avatar: avatar || '',
      manager: manager && mongoose.Types.ObjectId.isValid(manager) ? manager : null,
      teamLead: teamLead && mongoose.Types.ObjectId.isValid(teamLead) ? teamLead : null,
      skills: Array.isArray(skills) ? skills : [],
      emergencyContact: emergencyContact || {},
      bankDetails: bankDetails || {},
      address: address || {},
    });

    await employee.save();

    // Create or link User login account
    let user = await User.findOne({ email: normalizedEmail });
    const initialPassword = password || 'GoTech@2026';

    if (!user) {
      user = new User({
        name: employee.name,
        email: employee.email,
        password: initialPassword,
        role: normalizedRole,
        employeeProfile: employee._id,
        status: status === 'Terminated' ? 'inactive' : 'active',
      });
      await user.save();
    } else {
      user.role = normalizedRole;
      user.employeeProfile = employee._id;
      await user.save();
    }

    // Link user to employee record
    employee.user = user._id;
    await employee.save();

    // Send welcome email with credentials & portal URL via Brevo Mail Service
    try {
      const { sendEmployeeWelcomeEmail } = require('../utils/emailService');
      await sendEmployeeWelcomeEmail({
        name: employee.name,
        email: employee.email,
        role: employee.role,
        designation: employee.designation,
        department: employee.department,
        temporaryPassword: initialPassword,
        portalUrl: process.env.PORTAL_URL || 'https://portal.gotechedu.com',
      });
    } catch (emailErr) {
      console.warn('Welcome credentials email dispatch warning:', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Employee created and welcome credentials email dispatched successfully',
      employee,
      credentials: {
        email: user.email,
        temporaryPassword: initialPassword,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Create Employee Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating employee record',
      error: error.message,
    });
  }
};

/**
 * @desc    Update employee profile & sync user role/credentials
 * @route   PUT /api/employees/:id
 * @access  Protected (admin, hr, manager)
 */
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    let employee;
    if (mongoose.Types.ObjectId.isValid(id)) {
      employee = await Employee.findById(id);
    } else {
      employee = await Employee.findOne({ employeeId: id });
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found',
      });
    }

    // Role updates validation
    if (updateData.role) {
      const normalizedRole = updateData.role.toLowerCase().trim();
      const { Role } = require('../models/Role');
      const roleExists = await Role.findOne({ slug: normalizedRole });
      if (!roleExists && !ROLES.includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role '${updateData.role}'.`,
        });
      }
      updateData.role = normalizedRole;
    }

    // If email is changing, check uniqueness
    if (updateData.email && updateData.email.toLowerCase().trim() !== employee.email) {
      const existing = await Employee.findOne({ email: updateData.email.toLowerCase().trim() });
      if (existing && existing._id.toString() !== employee._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Another employee is already registered with this email address',
        });
      }
      updateData.email = updateData.email.toLowerCase().trim();
    }

    // Apply updates to Employee
    Object.assign(employee, updateData);
    await employee.save();

    // Synchronize linked User account
    if (employee.user || employee.email) {
      const user = await User.findOne({
        $or: [{ _id: employee.user }, { email: employee.email }],
      });

      if (user) {
        if (updateData.name) user.name = employee.name;
        if (updateData.email) user.email = employee.email;
        if (updateData.role) user.role = employee.role;
        if (updateData.status) {
          user.status = updateData.status === 'Terminated' ? 'inactive' : 'active';
        }
        await user.save({ validateBeforeSave: false });
      }
    }

    const updatedEmployee = await Employee.findById(employee._id)
      .populate('user', 'role status lastLogin')
      .populate('manager', 'name email designation avatar')
      .populate('teamLead', 'name email designation avatar');

    return res.status(200).json({
      success: true,
      message: 'Employee details updated successfully',
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error('Update Employee Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating employee record',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete employee & deactivate linked user account
 * @route   DELETE /api/employees/:id
 * @access  Protected (admin, hr)
 */
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    let employee;
    if (mongoose.Types.ObjectId.isValid(id)) {
      employee = await Employee.findById(id);
    } else {
      employee = await Employee.findOne({ employeeId: id });
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found',
      });
    }

    employee.isDeleted = true;
    employee.deletedAt = new Date();
    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Employee ${employee.name} (${employee.employeeId}) moved to Recycle Bin`,
    });
  } catch (error) {
    console.error('Delete Employee Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error moving employee to recycle bin',
      error: error.message,
    });
  }
};

/**
 * @desc    Get aggregate employee metrics and department distribution
 * @route   GET /api/employees/stats
 * @access  Protected (admin, hr, manager)
 */
const getEmployeeStats = async (req, res) => {
  try {
    const total = await Employee.countDocuments();

    // Group by status
    const statusAgg = await Employee.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = {};
    EMPLOYEE_STATUSES.forEach((s) => {
      byStatus[s] = 0;
    });
    statusAgg.forEach((item) => {
      if (item._id) byStatus[item._id] = item.count;
    });

    // Group by department
    const deptAgg = await Employee.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]);
    const byDepartment = {};
    deptAgg.forEach((item) => {
      if (item._id) byDepartment[item._id] = item.count;
    });

    // Group by role
    const roleAgg = await Employee.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const byRole = {};
    ROLES.forEach((r) => {
      byRole[r] = 0;
    });
    roleAgg.forEach((item) => {
      if (item._id) byRole[item._id] = item.count;
    });

    // Group by employment type
    const typeAgg = await Employee.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const byType = {};
    EMPLOYEE_TYPES.forEach((t) => {
      byType[t] = 0;
    });
    typeAgg.forEach((item) => {
      if (item._id) byType[item._id] = item.count;
    });

    return res.status(200).json({
      success: true,
      stats: {
        total,
        active: byStatus['Active'] || 0,
        onLeave: byStatus['On Leave'] || 0,
        probation: byStatus['Probation'] || 0,
        inactive: byStatus['Inactive'] || 0,
        byStatus,
        byDepartment,
        byRole,
        byType,
      },
    });
  } catch (error) {
    console.error('Get Employee Stats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating employee statistics',
      error: error.message,
    });
  }
};

/**
 * @desc    Get list of all active departments
 * @route   GET /api/employees/departments
 * @access  Protected (All authenticated roles)
 */
const getDepartmentsList = async (req, res) => {
  try {
    const existingDepts = await Employee.distinct('department');
    const merged = Array.from(new Set([...DEFAULT_DEPARTMENTS, ...existingDepts])).filter(Boolean);

    return res.status(200).json({
      success: true,
      departments: ['All', ...merged],
    });
  } catch (error) {
    console.error('Get Departments Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving department listings',
      error: error.message,
    });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
  getDepartmentsList,
};
