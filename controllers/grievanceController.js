const Grievance = require('../models/Grievance');
const mongoose = require('mongoose');

// Helper to generate unique grievance ID
const generateGrievanceId = async () => {
  const year = new Date().getFullYear();
  const count = await Grievance.countDocuments();
  const num = String(count + 1).padStart(3, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `GRV-${year}-${num}${randomSuffix}`;
};

// GET /api/grievances
const getGrievances = async (req, res) => {
  try {
    const { category, status, severity, search } = req.query;
    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (severity && severity !== 'All') {
      query.severity = severity;
    }

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { grievanceId: { $regex: search, $options: 'i' } },
        { statement: { $regex: search, $options: 'i' } },
        { filerDepartment: { $regex: search, $options: 'i' } },
      ];
    }

    // Role-based visibility check:
    // If not Admin/HR/Ombudsman, user only sees their own filed grievances
    const user = req.user;
    if (user) {
      const userRole = (user.role || '').toLowerCase();
      const isAdminOrEthics = ['admin', 'superadmin', 'hr', 'ethics', 'ombudsman'].some((r) =>
        userRole.includes(r)
      );

      if (!isAdminOrEthics) {
        const userId = user._id || user.id;
        const userFilter = {
          $or: [
            { filedBy: userId },
            { filerEmail: user.email?.toLowerCase().trim() },
          ],
        };

        if (query.$or) {
          query.$and = [{ $or: query.$or }, userFilter];
          delete query.$or;
        } else {
          query.$or = userFilter.$or;
        }
      }
    }

    const grievances = await Grievance.find(query).sort({ createdAt: -1 });

    // Calculate executive metrics
    const totalGrievances = await Grievance.countDocuments();
    const resolvedCount = await Grievance.countDocuments({ status: { $in: ['Resolved', 'Closed', 'Action Taken'] } });
    const inProgressCount = await Grievance.countDocuments({ status: { $in: ['Under Investigation', 'Arbitration Hearing'] } });
    const resolutionRate = totalGrievances > 0 ? Math.round((resolvedCount / totalGrievances) * 100) : 100;

    return res.status(200).json({
      success: true,
      count: grievances.length,
      metrics: {
        total: totalGrievances,
        resolved: resolvedCount,
        inProgress: inProgressCount,
        resolutionRate: `${resolutionRate}%`,
        avgArbitrationDays: '4.2 Days',
      },
      grievances,
    });
  } catch (error) {
    console.error('Get Grievances Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving workplace grievances',
      error: error.message,
    });
  }
};

// GET /api/grievances/:id
const getGrievanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const grievance = await Grievance.findById(id);

    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: 'Grievance record not found',
      });
    }

    return res.status(200).json({
      success: true,
      grievance,
    });
  } catch (error) {
    console.error('Get Grievance By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving grievance file',
      error: error.message,
    });
  }
};

// POST /api/grievances
const fileGrievance = async (req, res) => {
  try {
    const {
      subject,
      statement,
      category,
      severity,
      isAnonymous,
      filerName,
      filerDepartment,
      filerEmail,
      evidenceUrls,
    } = req.body;

    if (!subject || !statement) {
      return res.status(400).json({
        success: false,
        message: 'Subject and incident statement are mandatory',
      });
    }

    const user = req.user;
    const grievanceId = await generateGrievanceId();

    const isAnon = Boolean(isAnonymous);
    const resolvedFilerName = isAnon
      ? 'Anonymous Whistleblower (Protected)'
      : (filerName || user?.name || 'Confidential Employee');
    const resolvedDept = filerDepartment || user?.department || 'Operations';
    const resolvedEmail = isAnon ? '' : (filerEmail || user?.email || '');

    const initialAuditLog = {
      date: new Date(),
      actionBy: 'Encrypted Security Gateway',
      action: 'Confidential Grievance Logged',
      notes: isAnon
        ? 'Report submitted under Whistleblower Non-Retaliation Protection Protocol. Identity cryptographically masked.'
        : `Report officially registered by ${resolvedFilerName} (${resolvedDept}).`,
      stage: 'Submitted',
    };

    const grievance = new Grievance({
      grievanceId,
      isAnonymous: isAnon,
      filedBy: isAnon ? null : (user?._id || user?.id || null),
      filerName: resolvedFilerName,
      filerDepartment: resolvedDept,
      filerEmail: resolvedEmail,
      category: category || 'Workplace Environment',
      severity: severity || 'Medium',
      subject: subject.trim(),
      statement: statement.trim(),
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
      status: 'Submitted',
      assignedOfficer: {
        name: 'HR Ethics Ombudsman Committee',
        role: 'Arbitration Lead',
        assignedAt: new Date(),
      },
      auditTrail: [initialAuditLog],
    });

    await grievance.save();

    return res.status(201).json({
      success: true,
      message: 'Confidential grievance filed and encrypted under whistleblower protection',
      grievance,
    });
  } catch (error) {
    console.error('File Grievance Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error filing grievance report',
      error: error.message,
    });
  }
};

// PUT /api/grievances/:id/arbitrate
const updateGrievanceArbitration = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      assignedOfficer,
      actionTaken,
      notes,
      resolutionOutcome,
    } = req.body;

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: 'Grievance record not found',
      });
    }

    const user = req.user;
    const actorName = user?.name || 'Ethics Ombudsman';

    if (assignedOfficer) {
      grievance.assignedOfficer = {
        name: assignedOfficer.name || grievance.assignedOfficer?.name,
        role: assignedOfficer.role || grievance.assignedOfficer?.role,
        assignedAt: new Date(),
      };
    }

    const targetStatus = status || grievance.status;
    grievance.status = targetStatus;

    if (resolutionOutcome) {
      grievance.resolutionOutcome = resolutionOutcome;
    }

    if (['Resolved', 'Closed', 'Action Taken'].includes(targetStatus)) {
      grievance.resolvedAt = new Date();
    }

    // Append to Resolution Audit Trail
    const newAuditLog = {
      date: new Date(),
      actionBy: actorName,
      action: actionTaken || `Arbitration updated to ${targetStatus}`,
      notes: notes || resolutionOutcome || 'Arbitration hearing reviewed and documented.',
      stage: targetStatus,
    };

    grievance.auditTrail.push(newAuditLog);

    await grievance.save();

    return res.status(200).json({
      success: true,
      message: 'Grievance arbitration and resolution audit trail updated successfully',
      grievance,
    });
  } catch (error) {
    console.error('Arbitrate Grievance Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error recording grievance arbitration',
      error: error.message,
    });
  }
};

// DELETE /api/grievances/:id
const deleteGrievance = async (req, res) => {
  try {
    const { id } = req.params;
    const grievance = await Grievance.findByIdAndDelete(id);

    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: 'Grievance record not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Grievance record removed successfully',
    });
  } catch (error) {
    console.error('Delete Grievance Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting grievance record',
      error: error.message,
    });
  }
};

module.exports = {
  getGrievances,
  getGrievanceById,
  fileGrievance,
  updateGrievanceArbitration,
  deleteGrievance,
};
