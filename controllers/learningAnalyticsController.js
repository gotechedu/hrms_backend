const { Course } = require('../models/Course');
const { Batch } = require('../models/Batch');
const { Enrollment } = require('../models/Enrollment');
const { User } = require('../models/User');
const { Certificate } = require('../models/Certificate');
const { CourseApplication } = require('../models/CourseApplication');
const { ClassSession } = require('../models/ClassSession');
const { LearningAttendance } = require('../models/LearningAttendance');

/**
 * GET /api/learning-analytics/overview
 * Super Admin & Admin LMS high-level dashboard metrics
 */
const getLMSOverview = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments({ isDeleted: { $ne: true } });
    const publishedCourses = await Course.countDocuments({
      isDeleted: { $ne: true },
      status: 'Active',
    });

    const activeBatches = await Batch.countDocuments({
      status: { $in: ['Active', 'Upcoming'] },
    });

    const totalTrainers = await User.countDocuments({ role: 'trainer', status: 'active' });
    const totalTrainees = await User.countDocuments({ role: 'trainee', status: 'active' });

    const totalEnrollments = await Enrollment.countDocuments({});
    const activeEnrollments = await Enrollment.countDocuments({ status: 'Active' });
    const completedEnrollments = await Enrollment.countDocuments({ status: 'Completed' });

    const totalCertificates = await Certificate.countDocuments({ status: 'Valid' });

    // Aggregate average progress across active/completed enrollments
    const progressAgg = await Enrollment.aggregate([
      { $group: { _id: null, avgProgress: { $avg: '$progressPercentage' }, avgAttendance: { $avg: '$attendancePercentage' } } },
    ]);

    const avgProgress = progressAgg[0]?.avgProgress ? Math.round(progressAgg[0].avgProgress) : 0;
    const avgAttendance = progressAgg[0]?.avgAttendance ? Math.round(progressAgg[0].avgAttendance) : 0;

    // Revenue calculation from paid applications
    const revenueAgg = await CourseApplication.aggregate([
      { $match: { feesStatus: 'Paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$feesAmount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    // Recent enrollments
    const recentEnrollments = await Enrollment.find({})
      .populate('trainee', 'name email phone')
      .populate('course', 'title')
      .populate('batch', 'name batchCode')
      .sort({ enrolledAt: -1 })
      .limit(6);

    return res.status(200).json({
      success: true,
      metrics: {
        totalCourses,
        publishedCourses,
        activeBatches,
        totalTrainers,
        totalTrainees,
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
        avgProgress,
        avgAttendance,
        totalCertificates,
        totalRevenue,
      },
      recentEnrollments,
    });
  } catch (error) {
    console.error('Get LMS Overview Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error calculating LMS analytics',
      error: error.message,
    });
  }
};

/**
 * GET /api/learning-analytics/batch-report/:batchId
 * Deep cohort analytics
 */
const getBatchReport = async (req, res) => {
  try {
    const { batchId } = req.params;
    const batch = await Batch.findById(batchId)
      .populate('course', 'title slug duration')
      .populate('trainers', 'name email avatar');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    const enrollments = await Enrollment.find({ batch: batchId }).populate('trainee', 'name email');
    const classesCount = await ClassSession.countDocuments({ batch: batchId });

    return res.status(200).json({
      success: true,
      batch,
      enrollmentsCount: enrollments.length,
      classesCount,
      enrollments,
    });
  } catch (error) {
    console.error('Get Batch Report Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving batch report',
      error: error.message,
    });
  }
};

module.exports = {
  getLMSOverview,
  getBatchReport,
};
