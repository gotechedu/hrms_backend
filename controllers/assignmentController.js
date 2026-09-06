const { Assignment } = require('../models/Assignment');
const { AssignmentSubmission } = require('../models/AssignmentSubmission');
const { Enrollment } = require('../models/Enrollment');
const { Batch } = require('../models/Batch');

/**
 * GET /api/assignments
 * List assignments based on role
 */
const getAllAssignments = async (req, res) => {
  try {
    const { courseId, batchId, status } = req.query;
    const filter = {};

    if (courseId) filter.course = courseId;
    if (batchId) filter.batch = batchId;
    if (status) filter.status = status;

    if (req.user && req.user.role === 'trainee') {
      const myEnrollments = await Enrollment.find({ trainee: req.user._id, status: 'Active' });
      const batchIds = myEnrollments.map((e) => e.batch).filter(Boolean);
      const courseIds = myEnrollments.map((e) => e.course).filter(Boolean);
      filter.$or = [
        { batch: { $in: batchIds } },
        { course: { $in: courseIds }, batch: null },
      ];
      filter.status = 'Published';
    }

    const assignments = await Assignment.find(filter)
      .populate('course', 'title slug image')
      .populate('batch', 'name batchCode')
      .populate('module', 'title order')
      .sort({ dueDate: 1 });

    // If trainee, attach their submission status for each assignment
    if (req.user && req.user.role === 'trainee') {
      const assignmentIds = assignments.map((a) => a._id);
      const mySubmissions = await AssignmentSubmission.find({
        assignment: { $in: assignmentIds },
        trainee: req.user._id,
      });

      const subMap = {};
      mySubmissions.forEach((s) => {
        subMap[s.assignment.toString()] = s;
      });

      const enriched = assignments.map((a) => ({
        ...a.toObject(),
        mySubmission: subMap[a._id.toString()] || null,
      }));

      return res.status(200).json({
        success: true,
        count: enriched.length,
        assignments: enriched,
      });
    }

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error('Get All Assignments Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving assignments',
      error: error.message,
    });
  }
};

/**
 * POST /api/assignments
 * Create new assignment (Admin or Trainer)
 */
const createAssignment = async (req, res) => {
  try {
    const {
      title,
      description,
      instructions,
      courseId,
      moduleId,
      batchId,
      dueDate,
      maxMarks,
      passingMarks,
      allowedFileTypes,
      maxFileSizeMb,
      submissionType,
    } = req.body;

    if (!title || !courseId || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, courseId, and dueDate are required',
      });
    }

    const assignment = await Assignment.create({
      title: title.trim(),
      description: description || '',
      instructions: instructions || '',
      course: courseId,
      module: moduleId || null,
      batch: batchId || null,
      createdBy: req.user._id,
      dueDate: new Date(dueDate),
      maxMarks: Number(maxMarks) || 100,
      passingMarks: Number(passingMarks) || 50,
      allowedFileTypes: Array.isArray(allowedFileTypes) ? allowedFileTypes : ['pdf', 'zip', 'docx'],
      maxFileSizeMb: Number(maxFileSizeMb) || 25,
      submissionType: submissionType || 'Any',
      status: 'Published',
    });

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      assignment,
    });
  } catch (error) {
    console.error('Create Assignment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating assignment',
      error: error.message,
    });
  }
};

/**
 * POST /api/assignments/:id/submit
 * Trainee submits their assignment solution
 */
const submitAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileUrl, fileName, linkUrl, textContent, batchId } = req.body;
    const traineeId = req.user._id;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    const isLate = new Date() > new Date(assignment.dueDate);

    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignment: id, trainee: traineeId },
      {
        assignment: id,
        trainee: traineeId,
        batch: batchId || assignment.batch || null,
        fileUrl: fileUrl || '',
        fileName: fileName || '',
        linkUrl: linkUrl || '',
        textContent: textContent || '',
        status: isLate ? 'Late' : 'Submitted',
        isLate,
        submittedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: isLate ? 'Assignment submitted (marked Late)' : 'Assignment submitted successfully!',
      submission,
    });
  } catch (error) {
    console.error('Submit Assignment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error submitting assignment',
      error: error.message,
    });
  }
};

/**
 * GET /api/assignments/:id/submissions
 * Trainer / Admin views all student submissions for an assignment
 */
const getAssignmentSubmissions = async (req, res) => {
  try {
    const { id } = req.params;
    const submissions = await AssignmentSubmission.find({ assignment: id })
      .populate('trainee', 'name email phone avatar collegeOrCompany')
      .populate('gradedBy', 'name email')
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error('Get Submissions Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving submissions',
      error: error.message,
    });
  }
};

/**
 * POST /api/assignments/submissions/:submissionId/grade
 * Trainer evaluates and grades an assignment submission
 */
const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { marksObtained, feedback, status } = req.body;

    const submission = await AssignmentSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    submission.marksObtained = Number(marksObtained);
    submission.feedback = feedback || '';
    submission.status = status || 'Graded';
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();

    await submission.save();

    return res.status(200).json({
      success: true,
      message: 'Submission evaluated and graded successfully',
      submission,
    });
  } catch (error) {
    console.error('Grade Submission Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error grading submission',
      error: error.message,
    });
  }
};

module.exports = {
  getAllAssignments,
  createAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
};
