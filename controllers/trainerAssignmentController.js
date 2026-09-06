const { User } = require('../models/User');
const { Batch } = require('../models/Batch');
const { Course } = require('../models/Course');
const { TrainerAssignment } = require('../models/TrainerAssignment');
const { Enrollment } = require('../models/Enrollment');
const { ClassSession } = require('../models/ClassSession');
const { AssignmentSubmission } = require('../models/AssignmentSubmission');
const { AuditLog } = require('../models/AuditLog');

/**
 * GET /api/trainer-assignments/trainers
 * List all users with role 'trainer'
 */
const getAllTrainers = async (req, res) => {
  try {
    const trainers = await User.find({ role: 'trainer', status: 'active' })
      .select('name email phone collegeOrCompany qualification status lastLogin')
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: trainers.length,
      trainers,
    });
  } catch (error) {
    console.error('Get All Trainers Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving trainers',
      error: error.message,
    });
  }
};

/**
 * GET /api/trainer-assignments
 * List all trainer assignments
 */
const getAllAssignments = async (req, res) => {
  try {
    const { trainerId, batchId, courseId, status } = req.query;
    const filter = {};

    if (trainerId) filter.trainer = trainerId;
    if (batchId) filter.batch = batchId;
    if (courseId) filter.course = courseId;
    if (status) filter.status = status;

    const assignments = await TrainerAssignment.find(filter)
      .populate('trainer', 'name email phone avatar')
      .populate('batch', 'name batchCode startDate endDate status mode')
      .populate('course', 'title slug image')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error('Get Trainer Assignments Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving trainer assignments',
      error: error.message,
    });
  }
};

/**
 * POST /api/trainer-assignments
 * Assign trainer to batch
 */
const createTrainerAssignment = async (req, res) => {
  try {
    const { trainerId, batchId, courseId, role = 'Primary Trainer', notes } = req.body;

    if (!trainerId || !batchId) {
      return res.status(400).json({
        success: false,
        message: 'trainerId and batchId are required',
      });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    const trainerUser = await User.findById(trainerId);
    if (!trainerUser) {
      return res.status(404).json({
        success: false,
        message: 'Trainer user not found',
      });
    }

    const finalCourseId = courseId || batch.course;

    const assignment = await TrainerAssignment.findOneAndUpdate(
      { trainer: trainerId, batch: batchId },
      {
        trainer: trainerId,
        batch: batchId,
        course: finalCourseId,
        role,
        notes: notes || '',
        status: 'Active',
        assignedBy: req.user?._id,
      },
      { upsert: true, new: true }
    );

    // Also add to batch.trainers array
    await Batch.findByIdAndUpdate(batchId, {
      $addToSet: { trainers: trainerId },
    });

    if (req.user) {
      await AuditLog.create({
        actor: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'TRAINER_ASSIGNED',
        entity: 'TrainerAssignment',
        entityId: assignment._id.toString(),
        metadata: { trainerId, batchId, courseId: finalCourseId },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Trainer assigned successfully to batch',
      assignment,
    });
  } catch (error) {
    console.error('Create Trainer Assignment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error assigning trainer',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/trainer-assignments/:id
 * Remove or deactivate trainer assignment
 */
const removeTrainerAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await TrainerAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    await Batch.findByIdAndUpdate(assignment.batch, {
      $pull: { trainers: assignment.trainer },
    });

    await TrainerAssignment.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Trainer assignment removed successfully',
    });
  } catch (error) {
    console.error('Remove Trainer Assignment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error removing trainer assignment',
      error: error.message,
    });
  }
};

/**
 * GET /api/trainer-assignments/trainer-dashboard-stats
 * Aggregated analytics for the logged-in trainer
 */
const getTrainerDashboardStats = async (req, res) => {
  try {
    const trainerId = req.user._id;

    // Find all active assigned batches
    const assignments = await TrainerAssignment.find({ trainer: trainerId, status: 'Active' });
    const batchIds = assignments.map((a) => a.batch);

    // Total unique trainees enrolled in assigned batches
    const totalTrainees = await Enrollment.countDocuments({
      batch: { $in: batchIds },
      status: { $in: ['Active', 'Completed'] },
    });

    // Upcoming classes for this trainer
    const upcomingClasses = await ClassSession.find({
      trainer: trainerId,
      sessionDate: { $gte: new Date() },
      status: 'Scheduled',
    })
      .populate('batch', 'name batchCode')
      .populate('course', 'title')
      .sort({ sessionDate: 1, startTime: 1 })
      .limit(5);

    // Pending submissions needing grading
    const pendingSubmissionsCount = await AssignmentSubmission.countDocuments({
      batch: { $in: batchIds },
      status: 'Submitted',
    });

    // Batches summary
    const batches = await Batch.find({ _id: { $in: batchIds } })
      .populate('course', 'title slug image')
      .sort({ startDate: -1 });

    return res.status(200).json({
      success: true,
      stats: {
        activeBatchesCount: batchIds.length,
        totalTrainees,
        pendingSubmissionsCount,
        upcomingClassesCount: upcomingClasses.length,
      },
      upcomingClasses,
      batches,
    });
  } catch (error) {
    console.error('Get Trainer Dashboard Stats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving trainer dashboard',
      error: error.message,
    });
  }
};

module.exports = {
  getAllTrainers,
  getAllAssignments,
  createTrainerAssignment,
  removeTrainerAssignment,
  getTrainerDashboardStats,
};
