const { ClassSession } = require('../models/ClassSession');
const { Batch } = require('../models/Batch');
const { Course } = require('../models/Course');
const { Enrollment } = require('../models/Enrollment');
const { TrainerAssignment } = require('../models/TrainerAssignment');

/**
 * GET /api/classes
 * Get classes by batch, date range, or trainer
 */
const getAllClasses = async (req, res) => {
  try {
    const { batchId, courseId, trainerId, status } = req.query;
    const filter = {};

    if (batchId) filter.batch = batchId;
    if (courseId) filter.course = courseId;
    if (trainerId) filter.trainer = trainerId;
    if (status) filter.status = status;

    // Trainee: filter to classes belonging to their enrolled batches
    if (req.user && req.user.role === 'trainee') {
      const myEnrollments = await Enrollment.find({ trainee: req.user._id, status: 'Active' });
      const batchIds = myEnrollments.map((e) => e.batch).filter(Boolean);
      filter.batch = { $in: batchIds };
    }

    // Trainer: filter to their assigned batches unless admin
    if (req.user && req.user.role === 'trainer') {
      const assignments = await TrainerAssignment.find({ trainer: req.user._id, status: 'Active' });
      const batchIds = assignments.map((a) => a.batch);
      filter.batch = { $in: batchIds };
    }

    const classes = await ClassSession.find(filter)
      .populate('batch', 'name batchCode mode')
      .populate('course', 'title slug image')
      .populate('trainer', 'name email avatar')
      .sort({ sessionDate: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      count: classes.length,
      classes,
    });
  } catch (error) {
    console.error('Get All Classes Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving classes',
      error: error.message,
    });
  }
};

/**
 * POST /api/classes
 * Trainer or Admin creates a new class session
 */
const createClass = async (req, res) => {
  try {
    const {
      title,
      description,
      batchId,
      courseId,
      trainerId,
      sessionDate,
      startTime,
      endTime,
      meetingProvider,
      meetingUrl,
      recordingUrl,
      resources,
    } = req.body;

    if (!title || !batchId || !sessionDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, batchId, sessionDate, startTime, and endTime are required',
      });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    const assignedTrainer = trainerId || (req.user.role === 'trainer' ? req.user._id : batch.trainers[0]);

    const newClass = await ClassSession.create({
      title: title.trim(),
      description: description || '',
      batch: batch._id,
      course: courseId || batch.course,
      trainer: assignedTrainer,
      sessionDate: new Date(sessionDate),
      startTime,
      endTime,
      meetingProvider: meetingProvider || batch.meetingProvider || 'Google Meet',
      meetingUrl: meetingUrl || batch.meetingLink || '',
      recordingUrl: recordingUrl || '',
      resources: Array.isArray(resources) ? resources : [],
      status: 'Scheduled',
    });

    return res.status(201).json({
      success: true,
      message: 'Class session scheduled successfully',
      classSession: newClass,
    });
  } catch (error) {
    console.error('Create Class Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating class session',
      error: error.message,
    });
  }
};

/**
 * PUT /api/classes/:id
 * Update class details or add recording URL
 */
const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const classSession = await ClassSession.findById(id);
    if (!classSession) {
      return res.status(404).json({
        success: false,
        message: 'Class session not found',
      });
    }

    const updatable = [
      'title',
      'description',
      'sessionDate',
      'startTime',
      'endTime',
      'meetingProvider',
      'meetingUrl',
      'recordingUrl',
      'status',
      'resources',
    ];

    updatable.forEach((field) => {
      if (req.body[field] !== undefined) {
        classSession[field] = req.body[field];
      }
    });

    await classSession.save();

    return res.status(200).json({
      success: true,
      message: 'Class session updated successfully',
      classSession,
    });
  } catch (error) {
    console.error('Update Class Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating class',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/classes/:id
 * Delete class session
 */
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    await ClassSession.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: 'Class session cancelled and removed',
    });
  } catch (error) {
    console.error('Delete Class Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting class',
      error: error.message,
    });
  }
};

module.exports = {
  getAllClasses,
  createClass,
  updateClass,
  deleteClass,
};
