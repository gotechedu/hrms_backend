const Policy = require('../models/Policy');
const mongoose = require('mongoose');

// GET /api/policies
const getPolicies = async (req, res) => {
  try {
    const { category, scope, search, status } = req.query;
    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (scope && scope !== 'All') {
      query.scope = scope;
    }

    if (status && status !== 'All') {
      query.status = status;
    } else {
      // By default show active policies unless explicitly requested
      query.status = { $ne: 'Archived' };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { policyCode: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    // Role-based visibility check:
    // If user is authenticated, check their role. If they are regular staff, filter role-based policies.
    const user = req.user;
    if (user) {
      const userRole = (user.role || '').toLowerCase();
      const isAdminOrHr = ['admin', 'superadmin', 'hr', 'ethics'].some((r) => userRole.includes(r));
      
      if (!isAdminOrHr) {
        // User can see Org-Wide policies OR Role-Based policies targeting their specific role
        const roleFilter = {
          $or: [
            { scope: 'Org-Wide' },
            { targetRoles: { $regex: new RegExp(user.role || 'employee', 'i') } },
          ],
        };

        if (query.$or) {
          query.$and = [{ $or: query.$or }, roleFilter];
          delete query.$or;
        } else {
          query.$or = roleFilter.$or;
        }
      }
    }

    const policies = await Policy.find(query).sort({ createdAt: -1 });

    // Calculate metadata metrics
    const totalCount = await Policy.countDocuments({ status: { $ne: 'Archived' } });
    const orgWideCount = await Policy.countDocuments({ scope: 'Org-Wide', status: { $ne: 'Archived' } });
    const roleBasedCount = await Policy.countDocuments({ scope: 'Role-Based', status: { $ne: 'Archived' } });

    return res.status(200).json({
      success: true,
      count: policies.length,
      metrics: {
        total: totalCount,
        orgWide: orgWideCount,
        roleBased: roleBasedCount,
      },
      policies,
    });
  } catch (error) {
    console.error('Get Policies Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving corporate policies',
      error: error.message,
    });
  }
};

// GET /api/policies/:id
const getPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findById(id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy document not found',
      });
    }

    return res.status(200).json({
      success: true,
      policy,
    });
  } catch (error) {
    console.error('Get Policy By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving policy document',
      error: error.message,
    });
  }
};

// POST /api/policies
const createPolicy = async (req, res) => {
  try {
    const {
      policyCode,
      title,
      category,
      scope,
      targetRoles,
      version,
      effectiveDate,
      lastReviewed,
      summary,
      clauses,
      attachmentUrl,
      status,
      requiresAcknowledgement,
    } = req.body;

    if (!policyCode || !title || !summary) {
      return res.status(400).json({
        success: false,
        message: 'Policy Code, Title, and Summary are required',
      });
    }

    const existing = await Policy.findOne({ policyCode: policyCode.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Policy code '${policyCode}' already exists`,
      });
    }

    const policy = new Policy({
      policyCode: policyCode.toUpperCase().trim(),
      title: title.trim(),
      category: category || 'Workplace Environment',
      scope: scope || 'Org-Wide',
      targetRoles: Array.isArray(targetRoles) ? targetRoles : (targetRoles ? targetRoles.split(',').map((r) => r.trim()) : []),
      version: version || 'v1.0',
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      lastReviewed: lastReviewed || new Date().toISOString().split('T')[0],
      summary: summary.trim(),
      clauses: Array.isArray(clauses) ? clauses : [],
      attachmentUrl: attachmentUrl || '',
      status: status || 'Active',
      requiresAcknowledgement: requiresAcknowledgement !== false,
      createdBy: req.user?._id || null,
    });

    await policy.save();

    return res.status(201).json({
      success: true,
      message: 'Corporate policy published successfully',
      policy,
    });
  } catch (error) {
    console.error('Create Policy Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error publishing policy',
      error: error.message,
    });
  }
};

// PUT /api/policies/:id
const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.policyCode) {
      updateData.policyCode = updateData.policyCode.toUpperCase().trim();
    }

    if (typeof updateData.targetRoles === 'string') {
      updateData.targetRoles = updateData.targetRoles.split(',').map((r) => r.trim()).filter(Boolean);
    }

    updateData.lastReviewed = new Date().toISOString().split('T')[0];

    const policy = await Policy.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy document not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Policy document updated successfully',
      policy,
    });
  } catch (error) {
    console.error('Update Policy Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating policy',
      error: error.message,
    });
  }
};

// DELETE /api/policies/:id
const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findByIdAndDelete(id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy document not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Policy document removed successfully',
    });
  } catch (error) {
    console.error('Delete Policy Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting policy',
      error: error.message,
    });
  }
};

// POST /api/policies/:id/acknowledge
const acknowledgePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const policy = await Policy.findById(id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy document not found',
      });
    }

    const userId = user?._id || user?.id;
    const userName = user?.name || req.body.userName || 'Employee';
    const userRole = user?.role || req.body.userRole || 'Team Member';

    // Check if already acknowledged
    const alreadyAck = policy.acknowledgedBy.some((a) => a.userId && a.userId.toString() === (userId || '').toString());

    if (!alreadyAck) {
      policy.acknowledgedBy.push({
        userId: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
        userName,
        userRole,
        acknowledgedAt: new Date(),
      });
      await policy.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Policy compliance acknowledgement recorded',
      acknowledgedCount: policy.acknowledgedBy.length,
    });
  } catch (error) {
    console.error('Acknowledge Policy Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error recording acknowledgement',
      error: error.message,
    });
  }
};

module.exports = {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  acknowledgePolicy,
};
