const mongoose = require('mongoose');
const { Enrollment } = require('../models/Enrollment');
const { Course } = require('../models/Course');
const { Batch } = require('../models/Batch');
const { Module } = require('../models/Module');
const { Lesson } = require('../models/Lesson');
const { LessonProgress } = require('../models/LessonProgress');
const { ClassSession } = require('../models/ClassSession');
const { AuditLog } = require('../models/AuditLog');

/**
 * GET /api/enrollments
 * Admin & Trainer view of all enrollments
 */
const getAllEnrollments = async (req, res) => {
  try {
    const { courseId, batchId, status, search } = req.query;
    const filter = {};

    if (courseId) filter.course = courseId;
    if (batchId) filter.batch = batchId;
    if (status && status !== 'All') filter.status = status;

    const enrollments = await Enrollment.find(filter)
      .populate('trainee', 'name email phone collegeOrCompany qualification status')
      .populate('course', 'title slug image category duration price')
      .populate('batch', 'name batchCode startDate endDate status mode')
      .sort({ enrolledAt: -1 });

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments,
    });
  } catch (error) {
    console.error('Get All Enrollments Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving enrollments',
      error: error.message,
    });
  }
};

/**
 * GET /api/enrollments/my-enrollments
 * Trainee portal - get all active/past enrollments for logged in learner
 */
const getMyEnrollments = async (req, res) => {
  try {
    const traineeId = req.user._id;

    const enrollments = await Enrollment.find({ trainee: traineeId })
      .populate('course', 'title slug image category duration totalHours rating instructor instructors badge')
      .populate({
        path: 'batch',
        select: 'name batchCode startDate endDate mode scheduleDays startTime endTime meetingLink status trainers',
        populate: {
          path: 'trainers',
          select: 'name email phone avatar',
        },
      })
      .sort({ enrolledAt: -1 });

    // For each enrollment, attach next upcoming class
    const enriched = await Promise.all(
      enrollments.map(async (enr) => {
        const nextClass = enr.batch
          ? await ClassSession.findOne({
              batch: enr.batch._id,
              sessionDate: { $gte: new Date() },
              status: 'Scheduled',
            })
              .sort({ sessionDate: 1, startTime: 1 })
              .select('title sessionDate startTime endTime meetingUrl meetingProvider')
          : null;

        return {
          ...enr.toObject(),
          nextClass,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: enriched.length,
      enrollments: enriched,
    });
  } catch (error) {
    console.error('Get My Enrollments Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving your enrollments',
      error: error.message,
    });
  }
};

/**
 * GET /api/enrollments/:id/learning-path
 * Trainee LMS Course Player - full interactive curriculum and progress state
 */
const getCoursePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const enrollment = await Enrollment.findById(id)
      .populate('course')
      .populate({
        path: 'batch',
        populate: {
          path: 'trainers',
          select: 'name email phone avatar designation',
        },
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment record not found',
      });
    }

    // Security & IDOR check: Trainee can ONLY access their own enrollment
    if (
      req.user.role !== 'superadmin' &&
      req.user.role !== 'admin' &&
      req.user.role !== 'trainer' &&
      enrollment.trainee.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have authorization to view this course enrollment.',
      });
    }

    const courseId = enrollment.course._id;

    // Fetch all published modules
    const modules = await Module.find({ course: courseId, isPublished: true }).sort({ order: 1 });
    const moduleIds = modules.map((m) => m._id);

    // Fetch all published lessons
    const lessons = await Lesson.find({ module: { $in: moduleIds }, isPublished: true }).sort({ order: 1 });

    // Fetch trainee's progress for all lessons in this course
    const progressList = await LessonProgress.find({
      trainee: enrollment.trainee,
      course: courseId,
    });

    const progressMap = {};
    progressList.forEach((p) => {
      progressMap[p.lesson.toString()] = {
        status: p.status,
        watchTimeSeconds: p.watchTimeSeconds,
        completedAt: p.completedAt,
        lastAccessedAt: p.lastAccessedAt,
      };
    });

    // Assemble structured curriculum with locked/unlocked state
    let totalLessonsCount = lessons.length;
    let completedLessonsCount = 0;
    let previousLessonCompleted = true; // First lesson is unlocked

    const curriculum = modules.map((mod) => {
      const modLessons = lessons.filter((l) => l.module.toString() === mod._id.toString());
      let modCompletedCount = 0;

      const enrichedLessons = modLessons.map((les) => {
        const prog = progressMap[les._id.toString()];
        const isCompleted = prog?.status === 'Completed';
        if (isCompleted) {
          completedLessonsCount++;
          modCompletedCount++;
        }

        // A lesson is unlocked if it is a preview lesson, or if previous lessons were completed, or user is admin/trainer
        const isUnlocked =
          req.user.role === 'superadmin' ||
          req.user.role === 'admin' ||
          req.user.role === 'trainer' ||
          les.isPreview ||
          previousLessonCompleted ||
          isCompleted;

        if (!isCompleted && les.isRequired) {
          previousLessonCompleted = false; // Next required lessons are locked until this is done
        }

        return {
          ...les.toObject(),
          isCompleted,
          isUnlocked,
          progress: prog || { status: 'Not Started', watchTimeSeconds: 0 },
        };
      });

      const modProgressPercentage =
        modLessons.length > 0 ? Math.round((modCompletedCount / modLessons.length) * 100) : 0;

      return {
        ...mod.toObject(),
        progressPercentage: modProgressPercentage,
        lessonsCount: modLessons.length,
        completedCount: modCompletedCount,
        lessons: enrichedLessons,
      };
    });

    const calculatedProgress =
      totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;

    // Update enrollment progress in background if it changed
    if (enrollment.progressPercentage !== calculatedProgress) {
      enrollment.progressPercentage = calculatedProgress;
      if (calculatedProgress >= 100) {
        enrollment.certificateEligible = true;
      }
      await enrollment.save();
    }

    return res.status(200).json({
      success: true,
      enrollment: {
        _id: enrollment._id,
        enrollmentNumber: enrollment.enrollmentNumber,
        status: enrollment.status,
        progressPercentage: calculatedProgress,
        completedLessonsCount,
        totalLessonsCount,
        certificateEligible: enrollment.certificateEligible,
        certificateIssued: enrollment.certificateIssued,
        lastAccessedLesson: enrollment.lastAccessedLesson,
      },
      course: enrollment.course,
      batch: enrollment.batch,
      curriculum,
    });
  } catch (error) {
    console.error('Get Course Player Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error loading course player',
      error: error.message,
    });
  }
};

/**
 * POST /api/enrollments/:id/lessons/:lessonId/complete
 * Mark a lesson complete and deterministically advance progress
 */
const markLessonComplete = async (req, res) => {
  try {
    const { id, lessonId } = req.params;
    const { watchTimeSeconds } = req.body;

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    // IDOR Check
    if (
      req.user.role !== 'superadmin' &&
      req.user.role !== 'admin' &&
      enrollment.trainee.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this enrollment progress.',
      });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    // Upsert LessonProgress
    await LessonProgress.findOneAndUpdate(
      { trainee: enrollment.trainee, lesson: lessonId },
      {
        trainee: enrollment.trainee,
        enrollment: enrollment._id,
        course: enrollment.course,
        module: lesson.module,
        lesson: lesson._id,
        status: 'Completed',
        watchTimeSeconds: Number(watchTimeSeconds || 0),
        lastAccessedAt: new Date(),
        completedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update last accessed lesson
    enrollment.lastAccessedLesson = lessonId;
    enrollment.lastAccessedAt = new Date();

    // Recalculate deterministic overall course progress
    const totalRequiredLessons = await Lesson.countDocuments({
      course: enrollment.course,
      isPublished: true,
    });

    const completedLessons = await LessonProgress.countDocuments({
      trainee: enrollment.trainee,
      course: enrollment.course,
      status: 'Completed',
    });

    const newProgress =
      totalRequiredLessons > 0 ? Math.min(100, Math.round((completedLessons / totalRequiredLessons) * 100)) : 100;

    enrollment.progressPercentage = newProgress;
    if (newProgress >= 100) {
      enrollment.status = 'Completed';
      enrollment.completedAt = new Date();
      enrollment.certificateEligible = true;
    }

    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: 'Lesson marked as completed!',
      progressPercentage: newProgress,
      completedLessons,
      totalRequiredLessons,
      isCourseCompleted: newProgress >= 100,
    });
  } catch (error) {
    console.error('Mark Lesson Complete Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating lesson completion',
      error: error.message,
    });
  }
};

module.exports = {
  getAllEnrollments,
  getMyEnrollments,
  getCoursePlayer,
  markLessonComplete,
};
