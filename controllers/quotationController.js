const mongoose = require('mongoose');
const { Quotation } = require('../models/Quotation');
const { ContactInquiry } = require('../models/ContactInquiry');
const { Course } = require('../models/Course');
const { CourseApplication } = require('../models/CourseApplication');
const { Enrollment } = require('../models/Enrollment');
const { User } = require('../models/User');
const {
  sendQuotationEmail,
  sendEnrollmentVerifiedEmail,
} = require('../utils/emailService');

const DEFAULT_UPI_IDS = ['gotechedu@ibl', 'gotechedu@axl', 'gotechedu@ybl'];
const PRIMARY_UPI = 'gotechedu@ybl';

const parsePrice = (val, fallback = 0) => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (!val) return fallback;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
};

/**
 * POST /api/quotations/send
 * Protected endpoint - HRMS staff creates and dispatches quotation email to client
 */
const createAndSendQuotation = async (req, res) => {
  try {
    const {
      inquiryId,
      type = 'learning_course',
      recipientName,
      recipientEmail,
      recipientPhone,
      recipientCompany,
      // Learning Course fields
      courseId,
      courseTitle,
      batch,
      // Solution fields
      solutionTitle,
      serviceType,
      scopeDescription,
      modules,
      estimatedDuration,
      // Pricing
      exactPrice,
      offeredPrice,
      validDays = 14,
      terms,
      notes,
    } = req.body;

    if (!recipientName || !recipientEmail || !recipientPhone) {
      return res.status(400).json({
        success: false,
        message: 'Recipient name, email, and phone number are required',
      });
    }

    const cleanOfferedPrice = parsePrice(offeredPrice, 0);
    const cleanExactPrice = parsePrice(exactPrice, cleanOfferedPrice);

    if (cleanOfferedPrice <= 0 && cleanExactPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid offered / quoted price is required',
      });
    }

    const cleanEmail = recipientEmail.toLowerCase().trim();

    let linkedCourse = null;
    let finalCourseTitle = courseTitle || '';
    let finalCategory = 'Software Development';
    let finalDuration = '';

    if (type === 'learning_course' && courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      linkedCourse = await Course.findById(courseId);
      if (linkedCourse) {
        finalCourseTitle = linkedCourse.title;
        finalCategory = linkedCourse.category || 'Development';
        finalDuration = linkedCourse.duration || '';
      }
    }

    // Generate unique Quotation reference
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const quotationNumber = `QT-${new Date().getFullYear()}-${randomSuffix}`;

    // UPI Deep Link & QR Code
    const upiUri = `upi://pay?pa=${PRIMARY_UPI}&pn=GoTechEdu&am=${cleanOfferedPrice}&cu=INR&tn=Quote-${quotationNumber}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      upiUri
    )}`;

    const validUntilDate = new Date(Date.now() + Number(validDays) * 24 * 60 * 60 * 1000);

    const quotation = new Quotation({
      quotationNumber,
      inquiry: inquiryId && mongoose.Types.ObjectId.isValid(inquiryId) ? inquiryId : null,
      type,
      recipient: {
        name: recipientName.trim(),
        email: cleanEmail,
        phone: recipientPhone.trim(),
        company: recipientCompany ? recipientCompany.trim() : '',
      },
      // Course specifics
      course: linkedCourse ? linkedCourse._id : null,
      courseTitle: finalCourseTitle,
      courseCategory: finalCategory,
      duration: finalDuration,
      batch: batch || 'Current Cohort 2026',
      // Solution specifics
      solutionTitle: solutionTitle || '',
      serviceType: serviceType || 'Enterprise Software (ERP/CRM/POS)',
      scopeDescription: scopeDescription || '',
      modules: Array.isArray(modules) ? modules : modules ? [modules] : [],
      estimatedDuration: estimatedDuration || '',
      // Financials
      exactPrice: cleanExactPrice,
      offeredPrice: cleanOfferedPrice,
      discount: Math.max(0, cleanExactPrice - cleanOfferedPrice),
      // Payment handles
      upiIds: DEFAULT_UPI_IDS,
      primaryUpi: PRIMARY_UPI,
      qrCodeData: qrCodeUrl,
      validUntil: validUntilDate,
      terms: terms || undefined,
      notes: notes || '',
      status: 'Sent',
      sentAt: new Date(),
    });

    await quotation.save();

    // If linked to an inquiry, update inquiry status and log audit note
    if (inquiryId && mongoose.Types.ObjectId.isValid(inquiryId)) {
      const inquiry = await ContactInquiry.findById(inquiryId);
      if (inquiry) {
        inquiry.status = 'Proposal Sent';
        inquiry.adminNotes.push({
          note: `Commercial quotation #${quotationNumber} (${
            type === 'learning_course' ? 'Learning Program' : 'Enterprise Solution'
          }) generated & dispatched via email for ₹${cleanOfferedPrice.toLocaleString('en-IN')}.`,
          author: req.user ? `${req.user.name || req.user.email} (Staff)` : 'Admin',
          createdAt: new Date(),
        });
        await inquiry.save();
      }
    }

    // Main Website quotation URL (Public quotation view)
    const mainSiteUrl = (
      process.env.MAIN_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'
    ).replace(/\/+$/, '');
    const quotationUrl = `${mainSiteUrl}/quotation/${quotation._id}`;

    // Dispatch Quotation Email
    try {
      await sendQuotationEmail({
        recipientName: recipientName.trim(),
        recipientEmail: cleanEmail,
        quotationNumber,
        type,
        courseTitle: finalCourseTitle,
        solutionTitle: solutionTitle || '',
        courseCategory: finalCategory,
        duration: finalDuration,
        exactPrice: cleanExactPrice,
        offeredPrice: cleanOfferedPrice,
        discount: Math.max(0, cleanExactPrice - cleanOfferedPrice),
        validUntil: validUntilDate,
        terms: quotation.terms,
        notes: notes || '',
        quotationUrl,
        qrCodeUrl,
      });
    } catch (emailErr) {
      console.warn('⚠️ [Quotation Email Warning]:', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Quotation #${quotationNumber} sent successfully to ${cleanEmail}`,
      quotation,
      quotationUrl,
    });
  } catch (error) {
    console.error('Create and Send Quotation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create and dispatch quotation',
      error: error.message,
    });
  }
};

/**
 * GET /api/quotations/inquiry/:inquiryId
 * Protected endpoint - List all quotations generated for a specific inquiry
 */
const getQuotationsByInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inquiry ID format',
      });
    }

    const quotations = await Quotation.find({ inquiry: inquiryId, isDeleted: false })
      .populate('course', 'title category duration price image')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: quotations.length,
      quotations,
    });
  } catch (error) {
    console.error('Get Quotations By Inquiry Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve quotations',
      error: error.message,
    });
  }
};

/**
 * GET /api/quotations
 * Protected endpoint - HRMS staff lists all quotations with filters
 */
const getAllQuotations = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const filter = { isDeleted: false };

    if (status && status !== 'All') filter.status = status;
    if (type && type !== 'All') filter.type = type;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { quotationNumber: { $regex: q, $options: 'i' } },
        { 'recipient.name': { $regex: q, $options: 'i' } },
        { 'recipient.email': { $regex: q, $options: 'i' } },
        { 'recipient.phone': { $regex: q, $options: 'i' } },
        { courseTitle: { $regex: q, $options: 'i' } },
        { solutionTitle: { $regex: q, $options: 'i' } },
      ];
    }

    const quotations = await Quotation.find(filter)
      .populate('inquiry', 'fullName email phone service budget status')
      .populate('course', 'title price category')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: quotations.length,
      quotations,
    });
  } catch (error) {
    console.error('Get All Quotations Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list quotations',
      error: error.message,
    });
  }
};

/**
 * GET /api/quotations/public/:id
 * Public endpoint - Recipient views quotation document
 */
const getPublicQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation reference identifier',
      });
    }

    const quotation = await Quotation.findOne({ _id: id, isDeleted: false })
      .populate('course', 'title description category duration totalHours image')
      .select('-verifiedBy -__v');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found or has been revoked',
      });
    }

    // Log first view timestamp
    if (!quotation.viewedAt) {
      quotation.viewedAt = new Date();
      if (quotation.status === 'Sent') {
        quotation.status = 'Viewed';
      }
      await quotation.save();
    }

    return res.status(200).json({
      success: true,
      quotation,
    });
  } catch (error) {
    console.error('Get Public Quotation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load quotation details',
      error: error.message,
    });
  }
};

/**
 * POST /api/quotations/public/:id/register
 * Public endpoint - Student fills basic details + UPI UTR payment confirmation
 * Sets registration state to 'pending' (unable to log in until verified)
 */
const submitQuotationRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      studentName,
      email,
      phone,
      collegeOrCompany,
      qualification,
      utrNumber,
      upiIdPaidTo = 'gotechedu@ybl',
      amountPaid,
      password,
      notes,
    } = req.body;

    if (!studentName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Student name, email, and phone number are required',
      });
    }

    if (!utrNumber || !utrNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: '12-digit UPI UTR / Transaction Reference number is required for verification',
      });
    }

    const quotation = await Quotation.findOne({ _id: id, isDeleted: false });
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Auto-create or fetch user account in 'pending' status
    const generatedPassword = password || `Student@${Math.floor(1000 + Math.random() * 9000)}`;
    let userDoc = await User.findOne({ email: cleanEmail });

    if (!userDoc) {
      userDoc = new User({
        name: studentName.trim(),
        email: cleanEmail,
        password: generatedPassword,
        role: 'trainee',
        phone: phone.trim(),
        collegeOrCompany: collegeOrCompany ? collegeOrCompany.trim() : '',
        qualification: qualification ? qualification.trim() : '',
        status: 'pending', // Trainee cannot log in until approved
      });
      await userDoc.save();
    } else {
      // If user exists and is not active, ensure status remains pending
      if (userDoc.status !== 'active') {
        userDoc.status = 'pending';
        await userDoc.save();
      }
    }

    // 2. If it is a learning course, create a CourseApplication in 'Pending' status
    let courseAppDoc = null;
    if (quotation.type === 'learning_course') {
      courseAppDoc = new CourseApplication({
        user: userDoc._id,
        course: quotation.course || null,
        courseTitle: quotation.courseTitle || 'Professional Training Course',
        courseCategory: quotation.courseCategory || 'Development',
        studentName: studentName.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        collegeOrCompany: collegeOrCompany || '',
        qualification: qualification || 'Undergraduate / Graduate',
        batch: quotation.batch || 'Current Cohort 2026',
        feesStatus: 'Unpaid', // Marked Unpaid / Pending Verification
        feesAmount: quotation.offeredPrice,
        status: 'Pending',
        paymentDetails: {
          razorpayOrderId: quotation.quotationNumber,
          razorpayPaymentId: utrNumber.trim(),
          paymentStatus: 'Pending',
          paymentMethod: `UPI Direct (${upiIdPaidTo})`,
          paidAt: new Date(),
        },
        notes: `Registered via Quotation ${quotation.quotationNumber}. UTR: ${utrNumber.trim()}. ${
          notes || ''
        }`,
      });
      await courseAppDoc.save();
    }

    // 3. Update Quotation payment submission state
    quotation.status = 'Payment_Submitted';
    quotation.paymentSubmission = {
      studentName: studentName.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      collegeOrCompany: collegeOrCompany ? collegeOrCompany.trim() : '',
      qualification: qualification ? qualification.trim() : '',
      utrNumber: utrNumber.trim(),
      paymentMode: `UPI Direct (${upiIdPaidTo})`,
      upiIdPaidTo,
      amountPaid: Number(amountPaid || quotation.offeredPrice),
      submittedAt: new Date(),
      notes: notes || '',
    };
    quotation.user = userDoc._id;
    if (courseAppDoc) {
      quotation.courseApplication = courseAppDoc._id;
    }
    await quotation.save();

    // 4. Update inquiry if linked
    if (quotation.inquiry) {
      await ContactInquiry.findByIdAndUpdate(quotation.inquiry, {
        status: 'In Discussion',
        $push: {
          adminNotes: {
            note: `Candidate ${studentName.trim()} submitted payment verification proof (UTR: ${utrNumber.trim()}) for Quotation ${
              quotation.quotationNumber
            }. Enrollment status: Pending verification.`,
            author: 'System (Quotation Portal)',
            createdAt: new Date(),
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Registration submitted successfully! Your account and enrollment are currently pending verification. Once our accounts department verifies your UPI reference, you will receive an activation email with login credentials.',
      quotationNumber: quotation.quotationNumber,
      status: 'pending',
    });
  } catch (error) {
    console.error('Submit Quotation Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit registration. Please verify details and try again.',
      error: error.message,
    });
  }
};

/**
 * POST /api/quotations/:id/verify
 * Protected endpoint - HRMS staff verifies payment and activates student account
 * Sends verification email with login credentials
 */
const verifyQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id).populate('course');

    if (!quotation || quotation.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (quotation.status === 'Verified') {
      return res.status(400).json({
        success: false,
        message: 'This quotation and candidate enrollment have already been verified.',
      });
    }

    const recipientEmail =
      quotation.paymentSubmission?.email || quotation.recipient?.email;
    const recipientName =
      quotation.paymentSubmission?.studentName || quotation.recipient?.name;

    // 1. Activate User account
    let userDoc = null;
    if (quotation.user) {
      userDoc = await User.findById(quotation.user);
    }
    if (!userDoc && recipientEmail) {
      userDoc = await User.findOne({ email: recipientEmail.toLowerCase().trim() });
    }

    let temporaryPassword = null;
    if (!userDoc) {
      temporaryPassword = `Student@${Math.floor(1000 + Math.random() * 9000)}`;
      userDoc = new User({
        name: recipientName,
        email: recipientEmail.toLowerCase().trim(),
        password: temporaryPassword,
        role: 'trainee',
        phone: quotation.paymentSubmission?.phone || quotation.recipient.phone,
        status: 'active',
      });
      await userDoc.save();
    } else {
      userDoc.status = 'active'; // Activate user so they are able to log in
      await userDoc.save();
    }

    // 2. Update Course Application if linked
    let appDoc = null;
    if (quotation.courseApplication) {
      appDoc = await CourseApplication.findById(quotation.courseApplication);
      if (appDoc) {
        appDoc.feesStatus = 'Paid';
        appDoc.status = 'Enrolled';
        appDoc.paymentDetails.paymentStatus = 'Success';
        appDoc.paymentDetails.paidAt = new Date();
        await appDoc.save();
      }
    }

    // 3. Create or activate Enrollment document
    if (quotation.type === 'learning_course' && quotation.course) {
      let enrollmentDoc = await Enrollment.findOne({
        trainee: userDoc._id,
        course: quotation.course._id,
      });

      if (!enrollmentDoc) {
        enrollmentDoc = new Enrollment({
          trainee: userDoc._id,
          course: quotation.course._id,
          application: appDoc ? appDoc._id : null,
          status: 'Active',
          paymentDetails: {
            orderId: quotation.quotationNumber,
            paymentId: quotation.paymentSubmission?.utrNumber || `UPI-MANUAL-${Date.now()}`,
            amount: quotation.offeredPrice,
            paidAt: new Date(),
            method: quotation.paymentSubmission?.paymentMode || 'UPI Transfer',
          },
        });
        await enrollmentDoc.save();
      } else {
        enrollmentDoc.status = 'Active';
        await enrollmentDoc.save();
      }

      // Add to user enrolled courses if not present
      const alreadyEnrolled = userDoc.enrolledCourses.some(
        (c) => c.course && c.course.toString() === quotation.course._id.toString()
      );
      if (!alreadyEnrolled) {
        userDoc.enrolledCourses.push({
          course: quotation.course._id,
          application: appDoc ? appDoc._id : null,
          courseTitle: quotation.courseTitle,
          enrolledAt: new Date(),
          status: 'Active',
        });
        await userDoc.save();
      }

      quotation.enrollment = enrollmentDoc._id;
    }

    // 4. Mark quotation as Verified
    quotation.status = 'Verified';
    quotation.verifiedAt = new Date();
    quotation.verifiedBy = req.user ? req.user._id : null;
    quotation.user = userDoc._id;
    await quotation.save();

    // 5. Update inquiry if linked
    if (quotation.inquiry) {
      await ContactInquiry.findByIdAndUpdate(quotation.inquiry, {
        status: 'Converted',
        $push: {
          adminNotes: {
            note: `Payment & enrollment officially verified by ${
              req.user ? req.user.name || req.user.email : 'Staff'
            } for Quotation ${quotation.quotationNumber}. Student access activated.`,
            author: req.user ? `${req.user.name || req.user.email} (Staff)` : 'Admin',
            createdAt: new Date(),
          },
        },
      });
    }

    // 6. Send Enrollment Verified Email with credentials
    const portalUrl = (process.env.PORTAL_URL || 'https://portal.gotechedu.com').replace(/\/+$/, '');
    try {
      await sendEnrollmentVerifiedEmail({
        studentName: recipientName,
        email: recipientEmail,
        courseTitle: quotation.courseTitle || quotation.solutionTitle || 'GoTechEdu Program',
        temporaryPassword,
        portalUrl,
        batch: quotation.batch || 'Current Cohort 2026',
      });
    } catch (emailErr) {
      console.warn('⚠️ [Verification Email Warning]:', emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Quotation #${quotation.quotationNumber} verified! Student account activated and verification email sent to ${recipientEmail}.`,
      quotation,
    });
  } catch (error) {
    console.error('Verify Quotation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify quotation and activate account',
      error: error.message,
    });
  }
};

module.exports = {
  createAndSendQuotation,
  getQuotationsByInquiry,
  getAllQuotations,
  getPublicQuotation,
  submitQuotationRegistration,
  verifyQuotation,
};
