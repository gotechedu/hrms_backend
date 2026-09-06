const { Certificate } = require('../models/Certificate');
const { Enrollment } = require('../models/Enrollment');
const { Course } = require('../models/Course');
const { User } = require('../models/User');
const { AuditLog } = require('../models/AuditLog');

/**
 * GET /api/certificates
 * List certificates based on role
 */
const getAllCertificates = async (req, res) => {
  try {
    const filter = {};
    if (req.user && req.user.role === 'trainee') {
      filter.trainee = req.user._id;
    }

    const certificates = await Certificate.find(filter)
      .populate('course', 'title slug image')
      .populate('batch', 'name batchCode')
      .populate('trainee', 'name email')
      .sort({ issueDate: -1 });

    return res.status(200).json({
      success: true,
      count: certificates.length,
      certificates,
    });
  } catch (error) {
    console.error('Get Certificates Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving certificates',
      error: error.message,
    });
  }
};

/**
 * POST /api/certificates/issue
 * Issue a formal certificate for an eligible enrollment
 */
const issueCertificate = async (req, res) => {
  try {
    const { enrollmentId, customRemarks } = req.body;
    if (!enrollmentId) {
      return res.status(400).json({
        success: false,
        message: 'enrollmentId is required',
      });
    }

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('trainee', 'name email')
      .populate('course', 'title')
      .populate('batch', 'name');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    // Check if certificate already issued
    let existingCert = await Certificate.findOne({ enrollment: enrollment._id });
    if (existingCert) {
      return res.status(200).json({
        success: true,
        message: 'Certificate already issued for this enrollment',
        certificate: existingCert,
      });
    }

    const cert = await Certificate.create({
      trainee: enrollment.trainee._id,
      traineeName: enrollment.trainee.name,
      traineeEmail: enrollment.trainee.email,
      course: enrollment.course._id,
      courseTitle: enrollment.course.title,
      batch: enrollment.batch?._id || null,
      batchName: enrollment.batch?.name || 'General Cohort',
      enrollment: enrollment._id,
      finalScore: enrollment.progressPercentage || 100,
      attendancePercentage: enrollment.attendancePercentage || 100,
      issuedBy: req.user._id,
      status: 'Valid',
      issueDate: new Date(),
      completionDate: enrollment.completedAt || new Date(),
    });

    enrollment.certificateIssued = true;
    enrollment.certificate = cert._id;
    await enrollment.save();

    if (req.user) {
      await AuditLog.create({
        actor: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'CERTIFICATE_ISSUED',
        entity: 'Certificate',
        entityId: cert._id.toString(),
        metadata: { certificateId: cert.certificateId, traineeEmail: enrollment.trainee.email },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Certificate issued successfully!',
      certificate: cert,
    });
  } catch (error) {
    console.error('Issue Certificate Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error issuing certificate',
      error: error.message,
    });
  }
};

/**
 * GET /api/certificates/verify/:code
 * Public verification endpoint for employers and trainees (Zero auth required)
 */
const verifyCertificatePublic = async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = code.trim().toLowerCase();

    // Query either by verificationCode or certificateId
    const cert = await Certificate.findOne({
      $or: [
        { verificationCode: cleanCode },
        { certificateId: code.trim().toUpperCase() },
      ],
    }).populate('course', 'title category duration');

    if (!cert) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Certificate not found. This credential code does not exist in our registry.',
      });
    }

    return res.status(200).json({
      success: true,
      valid: cert.status === 'Valid',
      certificate: {
        certificateId: cert.certificateId,
        verificationCode: cert.verificationCode,
        traineeName: cert.traineeName,
        courseTitle: cert.courseTitle,
        batchName: cert.batchName,
        issueDate: cert.issueDate,
        completionDate: cert.completionDate,
        finalScore: cert.finalScore,
        status: cert.status,
        organization: 'GoTechEdu Educational Technologies',
      },
    });
  } catch (error) {
    console.error('Verify Certificate Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error verifying certificate',
      error: error.message,
    });
  }
};

module.exports = {
  getAllCertificates,
  issueCertificate,
  verifyCertificatePublic,
};
