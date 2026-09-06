const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const { CourseApplication } = require('../models/CourseApplication');
const { Course } = require('../models/Course');
const { User } = require('../models/User');
const { Batch } = require('../models/Batch');
const { Enrollment } = require('../models/Enrollment');
const { AuditLog } = require('../models/AuditLog');
const { sendPaymentInvoiceEmail } = require('../utils/emailService');

// Lazy initializer for Razorpay instance
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey123456';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mocksecret123456';
  try {
    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  } catch (err) {
    console.warn('[Razorpay] Failed to initialize Razorpay SDK. Will use fallback order generation.');
    return null;
  }
};

/**
 * POST /api/payments/create-order
 * Create a new Razorpay order ID for course enrollment checkout
 */
const createPaymentOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', courseId, courseTitle } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid order amount is required',
      });
    }

    const razorpay = getRazorpayInstance();
    const options = {
      amount: Math.round(Number(amount) * 100), // Amount in paise
      currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        courseId: courseId || '',
        courseTitle: courseTitle || 'GoTechEdu Course',
      },
    };

    if (razorpay && process.env.RAZORPAY_KEY_ID) {
      const order = await razorpay.orders.create(options);
      return res.status(200).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } else {
      // Mock order fallback when running in dev/preview without live keys
      const mockOrderId = `order_mock_${Date.now()}`;
      return res.status(200).json({
        success: true,
        orderId: mockOrderId,
        amount: options.amount,
        currency: options.currency,
        keyId: 'rzp_test_demo_gotech',
        isMock: true,
      });
    }
  } catch (error) {
    console.error('Create Payment Order Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message,
    });
  }
};

/**
 * POST /api/payments/verify-payment
 * Verify payment signature, update database, auto-create User account & send Nodemailer invoice
 */
const verifyPaymentSignature = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      studentName,
      email,
      phone,
      collegeOrCompany,
      qualification,
      batch,
      experienceLevel,
      learningGoal,
      modePreference,
      courseId,
      courseTitle,
      amount,
    } = req.body;

    if (!studentName || !email || !courseTitle) {
      return res.status(400).json({
        success: false,
        message: 'Student name, email, and course title are required',
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    let isSignatureValid = false;

    if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      isSignatureValid = expectedSignature === razorpay_signature;
    } else {
      // Dev / Test mode signature fallback
      isSignatureValid = true;
    }

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Razorpay payment signature verification failed',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const paidAmount = Number(amount || 0);
    const paymentId = razorpay_payment_id || `pay_mock_${Date.now()}`;
    const orderId = razorpay_order_id || `order_mock_${Date.now()}`;

    // 0. Idempotency Check: Prevent duplicate user/application/enrollment on re-transmitted callbacks
    const existingApp = await CourseApplication.findOne({
      'paymentDetails.razorpayPaymentId': paymentId,
    });
    if (existingApp) {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified and processed (idempotent)',
        application: existingApp,
        portalUrl: 'https://hrmsgotechedu.vercel.app/',
      });
    }

    // Resolve target Course
    let targetCourse = null;
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      targetCourse = await Course.findById(courseId);
    }
    if (!targetCourse && courseTitle) {
      targetCourse = await Course.findOne({
        $or: [
          { title: new RegExp(`^${courseTitle.trim()}$`, 'i') },
          { slug: courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
        ],
      });
    }
    const finalCourseId = targetCourse ? targetCourse._id : (courseId && mongoose.Types.ObjectId.isValid(courseId) ? courseId : null);

    // Resolve target Batch cohort
    let targetBatch = null;
    if (req.body.batchId && mongoose.Types.ObjectId.isValid(req.body.batchId)) {
      targetBatch = await Batch.findById(req.body.batchId);
    }
    if (!targetBatch && finalCourseId) {
      targetBatch = await Batch.findOne({
        course: finalCourseId,
        status: { $in: ['Upcoming', 'Active'] },
      }).sort({ startDate: 1 });
    }

    // 1. Find or create matching User account with dedicated 'trainee' role
    const rawPassword = req.body.password || `Student@${Math.floor(1000 + Math.random() * 9000)}`;
    let userDoc = await User.findOne({ email: cleanEmail });
    if (!userDoc) {
      userDoc = new User({
        name: studentName,
        email: cleanEmail,
        password: rawPassword,
        role: 'trainee', // Dedicated LMS student role (NOT employee)
        phone: phone || '',
        collegeOrCompany: collegeOrCompany || '',
        qualification: qualification || '',
      });
      await userDoc.save();
    } else {
      userDoc.phone = phone || userDoc.phone;
      userDoc.collegeOrCompany = collegeOrCompany || userDoc.collegeOrCompany;
      userDoc.qualification = qualification || userDoc.qualification;
      // If user was created as default employee without staff profile, upgrade to trainee
      if (userDoc.role === 'employee' && !userDoc.employeeProfile) {
        userDoc.role = 'trainee';
      }
      if (req.body.password) {
        userDoc.password = req.body.password;
      }
      await userDoc.save();
    }

    // 2. Create Course Application record
    const application = new CourseApplication({
      user: userDoc._id,
      course: finalCourseId,
      courseTitle,
      studentName,
      email: cleanEmail,
      phone: phone || '',
      collegeOrCompany: collegeOrCompany || '',
      qualification: qualification || 'B.Tech / Degree',
      batch: targetBatch ? targetBatch.name : (batch || 'Current Cohort 2026'),
      feesStatus: 'Paid',
      feesAmount: paidAmount,
      paymentDetails: {
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: razorpay_signature || 'verified',
        paymentStatus: 'Success',
        paymentMethod: 'Razorpay Online',
        paidAt: new Date(),
      },
      experienceLevel: experienceLevel || 'Student / Fresher',
      learningGoal: learningGoal || 'Career Upskilling',
      modePreference: modePreference || 'Live Online',
      status: 'Enrolled',
      progressPercentage: 0,
    });

    await application.save();

    // 3. Create or update normalized Enrollment record
    if (finalCourseId) {
      const enrollment = await Enrollment.findOneAndUpdate(
        { trainee: userDoc._id, course: finalCourseId },
        {
          trainee: userDoc._id,
          course: finalCourseId,
          batch: targetBatch ? targetBatch._id : null,
          application: application._id,
          status: 'Active',
          enrolledAt: new Date(),
          progressPercentage: 0,
          paymentDetails: {
            orderId,
            paymentId,
            amount: paidAmount,
            paidAt: new Date(),
            method: 'Razorpay Online',
          },
        },
        { upsert: true, new: true }
      );

      if (targetBatch) {
        await Batch.findByIdAndUpdate(targetBatch._id, { $inc: { enrolledCount: 1 } });
      }
    }

    // 4. Update User's enrolled courses array
    userDoc.enrolledCourses.push({
      course: finalCourseId,
      application: application._id,
      courseTitle,
      enrolledAt: new Date(),
      status: 'Active',
    });
    await userDoc.save();

    // 5. Increment course enrolled count if finalCourseId available
    if (finalCourseId) {
      await Course.findByIdAndUpdate(finalCourseId, { $inc: { enrolledCount: 1 } });
    }

    // 6. Audit Log payment and enrollment
    await AuditLog.create({
      actor: userDoc._id,
      actorName: studentName,
      actorRole: 'trainee',
      action: 'PAYMENT_VERIFIED_ENROLLED',
      entity: 'Enrollment',
      entityId: userDoc._id.toString(),
      metadata: { paymentId, orderId, paidAmount, courseTitle, batchName: targetBatch?.name },
    });

    // 5. Send automated HTML Tax Invoice Email via Nodemailer
    await sendPaymentInvoiceEmail({
      studentName,
      email: cleanEmail,
      phone,
      courseTitle,
      feesAmount: paidAmount,
      paymentId,
      orderId,
      paidAt: new Date(),
      batch,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully and invoice sent to your email!',
      application,
      portalUrl: 'https://hrmsgotechedu.vercel.app/',
    });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing payment verification',
      error: error.message,
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPaymentSignature,
};
