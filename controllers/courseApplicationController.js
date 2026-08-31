const { CourseApplication } = require('../models/CourseApplication');
const { Course } = require('../models/Course');
const { User } = require('../models/User');

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

    const cleanEmail = email.toLowerCase().trim();

    // Auto-link or Create User account
    const rawPassword = req.body.password || `Student@${Math.floor(1000 + Math.random() * 9000)}`;
    let userDoc = await User.findOne({ email: cleanEmail });
    if (!userDoc) {
      userDoc = new User({
        name: studentName,
        email: cleanEmail,
        password: rawPassword,
        role: 'employee',
        phone: phone || '',
        collegeOrCompany: collegeOrCompany || '',
        qualification: qualification || '',
      });
      await userDoc.save();
    } else if (req.body.password) {
      userDoc.password = req.body.password;
      await userDoc.save();
    }

    const application = new CourseApplication({
      user: userDoc._id,
      course: courseId || null,
      courseTitle,
      studentName,
      email: cleanEmail,
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

    if (req.body.paymentDetails) {
      application.paymentDetails = req.body.paymentDetails;
      if (req.body.paymentDetails.paymentStatus === 'Paid') {
        application.feesStatus = 'Paid';
        application.status = 'Enrolled';
      }
    }

    await application.save();

    // Update User enrolledCourses
    userDoc.enrolledCourses.push({
      course: courseId || null,
      application: application._id,
      courseTitle,
      enrolledAt: new Date(),
      status: application.feesStatus === 'Paid' ? 'Active' : 'Pending',
    });
    await userDoc.save();

    // Increment enrolled/applied count in Course if linked
    if (courseId) {
      await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });
    }

    // Try sending Nodemailer invoice email if feesStatus is Paid
    if (application.feesStatus === 'Paid') {
      try {
        const { sendPaymentInvoiceEmail } = require('../utils/emailService');
        await sendPaymentInvoiceEmail({
          studentName: application.studentName,
          email: application.email,
          phone: application.phone,
          courseTitle: application.courseTitle,
          paymentId: application.paymentDetails?.razorpayPaymentId || `pay_app_${Date.now()}`,
          orderId: application.paymentDetails?.razorpayOrderId || `order_app_${Date.now()}`,
          amount: application.feesAmount || req.body.amount || 21999,
          paidAt: new Date(),
        });
      } catch (emailErr) {
        console.warn('Invoice email notice:', emailErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Student candidate enrolled successfully!',
      application,
      portalUrl: 'https://hrmsgotechedu.vercel.app/',
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

    const applications = await CourseApplication.find(query)
      .populate('user', 'name email role status')
      .populate('course', 'title category duration price')
      .sort({ createdAt: -1 });

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
