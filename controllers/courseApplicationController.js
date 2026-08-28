const { CourseApplication } = require('../models/CourseApplication');
const { Course } = require('../models/Course');

// POST /api/course-applications (Submit or Add Student Candidate)
const submitCourseApplication = async (req, res) => {
  try {
    const {
      courseId,
      courseTitle,
      studentName,
      email,
      phone,
      collegeOrCompany,
      qualification,
      batch,
      feesStatus,
      feesAmount,
      experienceLevel,
      learningGoal,
      modePreference,
      status,
      progressPercentage,
      notes,
    } = req.body;

    if (!studentName || !email || !phone || !courseTitle) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and course title are required',
      });
    }

    const application = new CourseApplication({
      course: courseId || null,
      courseTitle,
      studentName,
      email: email.toLowerCase().trim(),
      phone,
      collegeOrCompany: collegeOrCompany || '',
      qualification: qualification || 'B.Tech / MCA / Degree',
      batch: batch || 'Current Cohort 2026',
      feesStatus: feesStatus || 'Unpaid',
      feesAmount: Number(feesAmount || 0),
      experienceLevel: experienceLevel || 'Student / Fresher',
      learningGoal: learningGoal || 'Career Transition / Upskilling',
      modePreference: modePreference || 'Live Online Labs',
      status: status || 'Pending',
      progressPercentage: Number(progressPercentage || 0),
      notes: notes || '',
    });

    await application.save();

    // Increment enrolled/applied count in Course if linked
    if (courseId) {
      await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });
    }

    return res.status(201).json({
      success: true,
      message: 'Student candidate enrolled successfully!',
      application,
    });
  } catch (error) {
    console.error('Submit Course Application Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating candidate enrollment',
      error: error.message,
    });
  }
};

// GET /api/course-applications (HRMS Course Candidates Directory)
const getAllCourseApplications = async (req, res) => {
  try {
    const { status, courseTitle, search, batch } = req.query;
    const query = { isDeleted: { $ne: true } };

    if (status && status !== 'All') {
      query.status = status;
    }
    if (courseTitle && courseTitle !== 'All') {
      query.courseTitle = { $regex: new RegExp(courseTitle, 'i') };
    }
    if (batch && batch !== 'All') {
      query.batch = { $regex: new RegExp(batch, 'i') };
    }
    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { studentName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { courseTitle: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { collegeOrCompany: { $regex: q, $options: 'i' } },
        { batch: { $regex: q, $options: 'i' } },
      ];
    }

    const applications = await CourseApplication.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error('Get Course Applications Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving course candidates',
      error: error.message,
    });
  }
};

// PUT /api/course-applications/:id
const updateCourseApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const application = await CourseApplication.findById(id);
    if (!application || application.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Course candidate application not found',
      });
    }

    Object.assign(application, updates);
    await application.save();

    return res.status(200).json({
      success: true,
      message: `Course candidate updated successfully`,
      application,
    });
  } catch (error) {
    console.error('Update Course Application Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating candidate application',
      error: error.message,
    });
  }
};

// DELETE /api/course-applications/:id (Soft delete to Recycle Bin)
const deleteCourseApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await CourseApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    application.isDeleted = true;
    application.deletedAt = new Date();
    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Course candidate moved to Recycle Bin',
    });
  } catch (error) {
    console.error('Delete Course Application Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error moving application to recycle bin',
      error: error.message,
    });
  }
};

module.exports = {
  submitCourseApplication,
  getAllCourseApplications,
  updateCourseApplicationStatus,
  deleteCourseApplication,
};
