const { Assessment } = require('../models/Assessment');
const { AssessmentAttempt } = require('../models/AssessmentAttempt');
const { Enrollment } = require('../models/Enrollment');

/**
 * GET /api/assessments
 * List assessments (Admin, Trainer, Trainee)
 */
const getAllAssessments = async (req, res) => {
  try {
    const { courseId, moduleId, type } = req.query;
    const filter = { isPublished: true };

    if (courseId) filter.course = courseId;
    if (moduleId) filter.module = moduleId;
    if (type) filter.type = type;

    const assessments = await Assessment.find(filter)
      .populate('course', 'title slug')
      .populate('module', 'title order')
      .select('-questions.options.isCorrect') // Hide answers in listing
      .sort({ createdAt: -1 });

    // If trainee, attach past attempts summary
    if (req.user && req.user.role === 'trainee') {
      const assessmentIds = assessments.map((a) => a._id);
      const myAttempts = await AssessmentAttempt.find({
        assessment: { $in: assessmentIds },
        trainee: req.user._id,
      }).sort({ submittedAt: -1 });

      const attemptsMap = {};
      myAttempts.forEach((att) => {
        if (!attemptsMap[att.assessment.toString()]) {
          attemptsMap[att.assessment.toString()] = [];
        }
        attemptsMap[att.assessment.toString()].push(att);
      });

      const enriched = assessments.map((a) => {
        const atts = attemptsMap[a._id.toString()] || [];
        const hasPassed = atts.some((at) => at.isPassed);
        const bestScore = atts.reduce((max, at) => Math.max(max, at.percentage), 0);

        return {
          ...a.toObject(),
          attemptsCount: atts.length,
          hasPassed,
          bestScore,
        };
      });

      return res.status(200).json({
        success: true,
        count: enriched.length,
        assessments: enriched,
      });
    }

    return res.status(200).json({
      success: true,
      count: assessments.length,
      assessments,
    });
  } catch (error) {
    console.error('Get All Assessments Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving assessments',
      error: error.message,
    });
  }
};

/**
 * GET /api/assessments/:id
 * Get single assessment for taking quiz
 */
const getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findById(id)
      .populate('course', 'title slug')
      .populate('module', 'title');

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    const isStaff =
      req.user &&
      (req.user.isSuperAdmin ||
        req.user.hasPermission('manage_learninghub') ||
        req.user.hasPermission('grade_submissions') ||
        req.user.can('manage', 'learninghub'));

    // Sanitize question options so correct answers aren't leaked to students
    const sanitizedQuestions = assessment.questions.map((q) => {
      const qObj = q.toObject();
      if (!isStaff) {
        qObj.options = qObj.options.map((opt) => ({
          text: opt.text,
          _id: opt._id,
        }));
        delete qObj.explanation;
      }
      return qObj;
    });

    return res.status(200).json({
      success: true,
      assessment: {
        ...assessment.toObject(),
        questions: sanitizedQuestions,
      },
    });
  } catch (error) {
    console.error('Get Assessment By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving assessment',
      error: error.message,
    });
  }
};

/**
 * POST /api/assessments
 * Create new quiz or exam
 */
const createAssessment = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      courseId,
      moduleId,
      batchId,
      durationMinutes,
      passingPercentage,
      maxAttempts,
      questions,
    } = req.body;

    if (!title || !courseId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title, courseId, and at least one question are required',
      });
    }

    const assessment = await Assessment.create({
      title: title.trim(),
      description: description || '',
      type: type || 'Quiz',
      course: courseId,
      module: moduleId || null,
      batch: batchId || null,
      durationMinutes: Number(durationMinutes) || 30,
      passingPercentage: Number(passingPercentage) || 60,
      maxAttempts: Number(maxAttempts) || 3,
      questions,
      isPublished: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      assessment,
    });
  } catch (error) {
    console.error('Create Assessment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating assessment',
      error: error.message,
    });
  }
};

/**
 * POST /api/assessments/:id/submit
 * Trainee submits quiz attempt and gets immediate deterministic grading
 */
const submitAssessmentAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, timeSpentSeconds, batchId } = req.body;
    const traineeId = req.user._id;

    const assessment = await Assessment.findById(id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    // Check attempts limit
    const pastAttemptsCount = await AssessmentAttempt.countDocuments({
      assessment: id,
      trainee: traineeId,
    });

    if (assessment.maxAttempts > 0 && pastAttemptsCount >= assessment.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempts limit (${assessment.maxAttempts}) reached for this assessment.`,
      });
    }

    let totalScore = 0;
    let maxPossibleScore = 0;
    const gradedAnswers = [];

    assessment.questions.forEach((q, qIndex) => {
      const qPoints = q.points || 1;
      maxPossibleScore += qPoints;

      // Find user submitted answer for this question
      const userAns = Array.isArray(answers) ? answers.find((a) => a.questionId === q._id.toString() || a.questionIndex === qIndex) : null;

      let isCorrect = false;
      let pointsEarned = 0;

      if (userAns) {
        if (q.questionType === 'mcq' || q.questionType === 'true_false') {
          // Check selected single option
          const selectedIdx = userAns.selectedOptionIndex;
          if (selectedIdx !== undefined && q.options[selectedIdx] && q.options[selectedIdx].isCorrect) {
            isCorrect = true;
            pointsEarned = qPoints;
          }
        } else if (q.questionType === 'multi_select') {
          // Check multi select
          const selectedIndices = userAns.selectedOptionIndices || [];
          const correctIndices = q.options.map((opt, i) => (opt.isCorrect ? i : -1)).filter((i) => i !== -1);
          const allMatch =
            selectedIndices.length === correctIndices.length &&
            selectedIndices.every((val) => correctIndices.includes(val));
          if (allMatch) {
            isCorrect = true;
            pointsEarned = qPoints;
          }
        }
      }

      totalScore += pointsEarned;
      gradedAnswers.push({
        questionId: q._id.toString(),
        selectedOptionIndices: userAns?.selectedOptionIndices || (userAns?.selectedOptionIndex !== undefined ? [userAns.selectedOptionIndex] : []),
        textAnswer: userAns?.textAnswer || '',
        isCorrect,
        pointsEarned,
      });
    });

    const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 100;
    const isPassed = percentage >= assessment.passingPercentage;

    const attempt = await AssessmentAttempt.create({
      assessment: id,
      trainee: traineeId,
      batch: batchId || assessment.batch || null,
      attemptNumber: pastAttemptsCount + 1,
      answers: gradedAnswers,
      score: totalScore,
      totalPoints: maxPossibleScore,
      percentage,
      isPassed,
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
      submittedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: isPassed ? 'Congratulations! You passed the assessment.' : 'Assessment submitted. You did not meet the passing score.',
      result: {
        attemptId: attempt._id,
        attemptNumber: attempt.attemptNumber,
        score: totalScore,
        totalPoints: maxPossibleScore,
        percentage,
        isPassed,
        passingPercentage: assessment.passingPercentage,
      },
    });
  } catch (error) {
    console.error('Submit Assessment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error grading assessment attempt',
      error: error.message,
    });
  }
};

module.exports = {
  getAllAssessments,
  getAssessmentById,
  createAssessment,
  submitAssessmentAttempt,
};
