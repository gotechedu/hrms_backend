const { CourseApplication } = require('../models/CourseApplication');
const { Course } = require('../models/Course');

// POST /api/course-applications (Public - submitted by students from official website)
const submitCourseApplication = async (req, res) => {
  try {
    const {
      courseId,
      courseTitle,
      studentName,
      email,
      phone,
      collegeOrCompany,
      experienceLevel,
      learningGoal,
      modePreference,
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
      experienceLevel: experienceLevel || 'Student / Fresher',
      learningGoal: learningGoal || 'Career Transition / Upskilling',
      modePreference: modePreference || 'Live Online Labs',
      status: 'Pending',
    });

    await application.save();

    // Increment enrolled/applied count in Course if linked
    if (courseId) {
      await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });
    }

    return res.status(201).json({
      success: true,
      message: 'Course enrollment application submitted successfully! Our admissions counselor will contact you soon.',
      application,
    });
  } catch (error) {
    console.error('Submit Course Application Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error submitting application',
      error: error.message,
    });
  }
};

// GET /api/course-applications (Protected - viewed in HRMS Applications)
const getAllCourseApplications = async (req, res) => {
  try {
    const { status, courseTitle, search } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }
    if (courseTitle && courseTitle !== 'All') {
      query.courseTitle = { $regex: new RegExp(courseTitle, 'i') };
    }
    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { studentName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { courseTitle: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
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
      message: 'Server error retrieving course applications',
      error: error.message,
    });
  }
};

// PUT /api/course-applications/:id
const updateCourseApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const application = await CourseApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    if (status) application.status = status;
    if (notes !== undefined) application.notes = notes;

    await application.save();

    return res.status(200).json({
      success: true,
      message: `Enrollment status updated to '${application.status}'`,
      application,
    });
  } catch (error) {
    console.error('Update Course Application Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating enrollment status',
      error: error.message,
    });
  }
};

// DELETE /api/course-applications/:id
const deleteCourseApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await CourseApplication.findByIdAndDelete(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Enrollment application removed successfully',
    });
  } catch (error) {
    console.error('Delete Course Application Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting application',
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
