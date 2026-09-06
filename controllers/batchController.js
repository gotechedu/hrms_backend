const mongoose = require('mongoose');
const { Batch } = require('../models/Batch');
const { Course } = require('../models/Course');
const { Enrollment } = require('../models/Enrollment');
const { TrainerAssignment } = require('../models/TrainerAssignment');
const { AuditLog } = require('../models/AuditLog');

/**
 * GET /api/batches
 * List batches with filtering (course, status, mode, trainer)
 */
const getAllBatches = async (req, res) => {
  try {
    const { courseId, status, mode, search } = req.query;
    const filter = {};

    if (courseId) {
      if (mongoose.Types.ObjectId.isValid(courseId)) {
        filter.course = courseId;
      } else {
        const c = await Course.findOne({ slug: courseId });
        if (c) filter.course = c._id;
      }
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (mode && mode !== 'All') {
      filter.mode = mode;
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { batchCode: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    // Role-based scoping: If trainer, only show batches assigned to this trainer
    if (req.user && req.user.role === 'trainer') {
      const assignments = await TrainerAssignment.find({ trainer: req.user._id, status: 'Active' });
      const assignedBatchIds = assignments.map((a) => a.batch);
      filter._id = { $in: assignedBatchIds };
    }

    const batches = await Batch.find(filter)
      .populate('course', 'title slug image category duration price')
      .populate('trainers', 'name email phone avatar designation')
      .sort({ startDate: -1 });

    return res.status(200).json({
      success: true,
      count: batches.length,
      batches,
    });
  } catch (error) {
    console.error('Get All Batches Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving batches',
      error: error.message,
    });
  }
};

/**
 * GET /api/batches/:id
 * Retrieve a single batch details
 */
const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findById(id)
      .populate('course', 'title slug image category duration price techStack modules')
      .populate('trainers', 'name email phone avatar designation');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    // Verify trainer authorization
    if (req.user && req.user.role === 'trainer') {
      const isAssigned = await TrainerAssignment.exists({
        trainer: req.user._id,
        batch: batch._id,
      });
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this batch.',
        });
      }
    }

    const enrolledCount = await Enrollment.countDocuments({
      batch: batch._id,
      status: { $in: ['Active', 'Completed'] },
    });

    return res.status(200).json({
      success: true,
      batch: {
        ...batch.toObject(),
        enrolledCount,
      },
    });
  } catch (error) {
    console.error('Get Batch By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving batch',
      error: error.message,
    });
  }
};

/**
 * POST /api/batches
 * Create a new batch
 */
const createBatch = async (req, res) => {
  try {
    const {
      name,
      batchCode,
      courseId,
      trainers,
      startDate,
      endDate,
      capacity,
      mode,
      scheduleDays,
      startTime,
      endTime,
      timezone,
      meetingProvider,
      meetingLink,
      location,
      status,
      enrollmentOpenDate,
      enrollmentCloseDate,
      notes,
    } = req.body;

    if (!name || !batchCode || !courseId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, batchCode, courseId, startDate, and endDate are required',
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Linked course not found',
      });
    }

    const cleanCode = batchCode.trim().toUpperCase();
    const existing = await Batch.findOne({ batchCode: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Batch code '${cleanCode}' already exists`,
      });
    }

    const trainerIds = Array.isArray(trainers) ? trainers : [];

    const newBatch = await Batch.create({
      name: name.trim(),
      batchCode: cleanCode,
      course: course._id,
      trainers: trainerIds,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      capacity: Number(capacity) || 30,
      mode: mode || 'Online',
      scheduleDays: Array.isArray(scheduleDays) && scheduleDays.length > 0 ? scheduleDays : ['Monday', 'Wednesday', 'Friday'],
      startTime: startTime || '19:00',
      endTime: endTime || '21:00',
      timezone: timezone || 'Asia/Kolkata',
      meetingProvider: meetingProvider || 'Google Meet',
      meetingLink: meetingLink || '',
      location: location || '',
      status: status || 'Upcoming',
      enrollmentOpenDate: enrollmentOpenDate ? new Date(enrollmentOpenDate) : new Date(),
      enrollmentCloseDate: enrollmentCloseDate ? new Date(enrollmentCloseDate) : null,
      notes: notes || '',
    });

    // Create trainer assignments
    for (const tId of trainerIds) {
      await TrainerAssignment.updateOne(
        { trainer: tId, batch: newBatch._id },
        {
          $set: {
            trainer: tId,
            batch: newBatch._id,
            course: course._id,
            assignedBy: req.user?._id,
            status: 'Active',
          },
        },
        { upsert: true }
      );
    }

    if (req.user) {
      await AuditLog.create({
        actor: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'BATCH_CREATED',
        entity: 'Batch',
        entityId: newBatch._id.toString(),
        metadata: { batchCode: cleanCode, name: newBatch.name },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Batch cohort created successfully',
      batch: newBatch,
    });
  } catch (error) {
    console.error('Create Batch Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating batch',
      error: error.message,
    });
  }
};

/**
 * PUT /api/batches/:id
 * Update batch details
 */
const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    const updatableFields = [
      'name',
      'batchCode',
      'startDate',
      'endDate',
      'capacity',
      'mode',
      'scheduleDays',
      'startTime',
      'endTime',
      'timezone',
      'meetingProvider',
      'meetingLink',
      'location',
      'status',
      'enrollmentOpenDate',
      'enrollmentCloseDate',
      'notes',
      'trainers',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        batch[field] = req.body[field];
      }
    });

    if (req.body.trainers && Array.isArray(req.body.trainers)) {
      // Sync TrainerAssignment
      for (const tId of req.body.trainers) {
        await TrainerAssignment.updateOne(
          { trainer: tId, batch: batch._id },
          {
            $set: {
              trainer: tId,
              batch: batch._id,
              course: batch.course,
              assignedBy: req.user?._id,
              status: 'Active',
            },
          },
          { upsert: true }
        );
      }
    }

    await batch.save();

    return res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      batch,
    });
  } catch (error) {
    console.error('Update Batch Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating batch',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/batches/:id
 * Delete batch
 */
const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    const activeEnrollments = await Enrollment.countDocuments({
      batch: id,
      status: { $in: ['Active', 'Pending'] },
    });

    if (activeEnrollments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete batch with ${activeEnrollments} active enrollments. Archive or complete the batch instead.`,
      });
    }

    await TrainerAssignment.deleteMany({ batch: id });
    await Batch.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Batch deleted successfully',
    });
  } catch (error) {
    console.error('Delete Batch Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting batch',
      error: error.message,
    });
  }
};

/**
 * GET /api/batches/:id/trainees
 * List all enrolled trainees inside a batch
 */
const getBatchTrainees = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    // RBAC: Trainer can only view their own batches
    if (req.user && req.user.role === 'trainer') {
      const isAssigned = await TrainerAssignment.exists({
        trainer: req.user._id,
        batch: id,
      });
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this batch roster.',
        });
      }
    }

    const enrollments = await Enrollment.find({ batch: id })
      .populate('trainee', 'name email phone collegeOrCompany qualification status')
      .sort({ enrolledAt: -1 });

    return res.status(200).json({
      success: true,
      batchId: id,
      batchName: batch.name,
      count: enrollments.length,
      trainees: enrollments.map((enr) => ({
        enrollmentId: enr._id,
        enrollmentNumber: enr.enrollmentNumber,
        trainee: enr.trainee,
        status: enr.status,
        enrolledAt: enr.enrolledAt,
        progressPercentage: enr.progressPercentage,
        attendancePercentage: enr.attendancePercentage,
        certificateIssued: enr.certificateIssued,
      })),
    });
  } catch (error) {
    console.error('Get Batch Trainees Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving batch trainees',
      error: error.message,
    });
  }
};

module.exports = {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchTrainees,
};
