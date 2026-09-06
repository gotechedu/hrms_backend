const { LearningAttendance } = require('../models/LearningAttendance');
const { ClassSession } = require('../models/ClassSession');
const { Batch } = require('../models/Batch');
const { Enrollment } = require('../models/Enrollment');

/**
 * GET /api/learning-attendance/class/:classId
 * Retrieve attendance roster for a specific class
 */
const getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const classSession = await ClassSession.findById(classId);
    if (!classSession) {
      return res.status(404).json({
        success: false,
        message: 'Class session not found',
      });
    }

    // Fetch all enrolled trainees in this batch
    const enrollments = await Enrollment.find({
      batch: classSession.batch,
      status: { $in: ['Active', 'Completed'] },
    }).populate('trainee', 'name email phone avatar');

    // Fetch existing attendance marks
    const existingAttendance = await LearningAttendance.find({
      classSession: classId,
    });

    const attendanceMap = {};
    existingAttendance.forEach((att) => {
      attendanceMap[att.trainee.toString()] = {
        _id: att._id,
        status: att.status,
        remarks: att.remarks,
        markedAt: att.createdAt,
      };
    });

    const roster = enrollments.map((enr) => ({
      trainee: enr.trainee,
      enrollmentId: enr._id,
      attendance: attendanceMap[enr.trainee._id.toString()] || {
        status: 'Unmarked',
        remarks: '',
      },
    }));

    return res.status(200).json({
      success: true,
      classSession,
      roster,
    });
  } catch (error) {
    console.error('Get Class Attendance Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving attendance',
      error: error.message,
    });
  }
};

/**
 * POST /api/learning-attendance/batch-mark
 * Trainer marks attendance for multiple trainees in a class session
 */
const markClassAttendance = async (req, res) => {
  try {
    const { classId, attendanceRecords } = req.body;

    if (!classId || !Array.isArray(attendanceRecords)) {
      return res.status(400).json({
        success: false,
        message: 'classId and attendanceRecords array are required',
      });
    }

    const classSession = await ClassSession.findById(classId);
    if (!classSession) {
      return res.status(404).json({
        success: false,
        message: 'Class session not found',
      });
    }

    const markedBy = req.user._id;

    for (const record of attendanceRecords) {
      const { traineeId, status, remarks } = record;
      if (!traineeId) continue;

      await LearningAttendance.findOneAndUpdate(
        { trainee: traineeId, classSession: classId },
        {
          trainee: traineeId,
          batch: classSession.batch,
          classSession: classId,
          date: classSession.sessionDate,
          status: status || 'Present',
          remarks: remarks || '',
          markedBy,
        },
        { upsert: true, new: true }
      );

      // Recalculate attendance percentage for trainee in this batch
      const totalClassesHeld = await ClassSession.countDocuments({
        batch: classSession.batch,
        sessionDate: { $lte: new Date() },
      });

      const classesAttended = await LearningAttendance.countDocuments({
        trainee: traineeId,
        batch: classSession.batch,
        status: { $in: ['Present', 'Late'] },
      });

      const attendancePercentage =
        totalClassesHeld > 0 ? Math.round((classesAttended / totalClassesHeld) * 100) : 100;

      await Enrollment.updateOne(
        { trainee: traineeId, batch: classSession.batch },
        { $set: { attendancePercentage } }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Successfully marked attendance for ${attendanceRecords.length} trainees`,
    });
  } catch (error) {
    console.error('Mark Class Attendance Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error marking attendance',
      error: error.message,
    });
  }
};

/**
 * GET /api/learning-attendance/my-attendance
 * Trainee view of their learning attendance across batches
 */
const getMyAttendance = async (req, res) => {
  try {
    const traineeId = req.user._id;

    const records = await LearningAttendance.find({ trainee: traineeId })
      .populate('classSession', 'title sessionDate startTime endTime meetingProvider')
      .populate('batch', 'name batchCode')
      .sort({ date: -1 });

    const totalCount = records.length;
    const presentCount = records.filter((r) => r.status === 'Present' || r.status === 'Late').length;
    const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

    return res.status(200).json({
      success: true,
      stats: {
        totalClasses: totalCount,
        attendedClasses: presentCount,
        overallPercentage: percentage,
      },
      records,
    });
  } catch (error) {
    console.error('Get My Attendance Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving attendance records',
      error: error.message,
    });
  }
};

module.exports = {
  getClassAttendance,
  markClassAttendance,
  getMyAttendance,
};
