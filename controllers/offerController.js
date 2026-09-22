const { Offer } = require('../models/Offer');
const { Course } = require('../models/Course');

/**
 * POST /api/offers (Create new offer coupon)
 */
const createOffer = async (req, res) => {
  try {
    const {
      title,
      code,
      description,
      discountType,
      discountValue,
      couponType,
      targetCourse,
      targetStudentEmail,
      bannerImage,
      badgeText,
      ctaText,
      isVisibleOnPortal,
      validUntil,
    } = req.body;

    if (!title || !code || !discountValue) {
      return res.status(400).json({
        success: false,
        message: 'Title, code, and discount value are required',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Offer.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Coupon code '${cleanCode}' already exists`,
      });
    }

    let targetCourseTitle = '';
    if (couponType === 'SPECIFIC_COURSE' && targetCourse) {
      const courseDoc = await Course.findById(targetCourse);
      if (courseDoc) {
        targetCourseTitle = courseDoc.title;
      }
    }

    // If marked isVisibleOnPortal, optionally set other offers isVisibleOnPortal to false so 1 offer is highlighted
    if (isVisibleOnPortal) {
      await Offer.updateMany({}, { isVisibleOnPortal: false });
    }

    const offer = new Offer({
      title,
      code: cleanCode,
      description: description || 'Special scholarship discount offer',
      discountType: discountType || 'PERCENTAGE',
      discountValue: Number(discountValue),
      couponType: couponType || 'ALL_COURSES',
      targetCourse: targetCourse || null,
      targetCourseTitle,
      targetStudentEmail: targetStudentEmail ? targetStudentEmail.toLowerCase().trim() : '',
      bannerImage: bannerImage || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
      badgeText: badgeText || '50% OFF TODAY',
      ctaText: ctaText || 'Grab This Offer',
      isVisibleOnPortal: Boolean(isVisibleOnPortal),
      status: 'Active',
      validUntil: validUntil || null,
    });

    await offer.save();

    return res.status(201).json({
      success: true,
      message: 'Offer coupon created successfully!',
      offer,
    });
  } catch (error) {
    console.error('Create Offer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create offer coupon',
      error: error.message,
    });
  }
};

/**
 * GET /api/offers (HRMS Directory List)
 */
const getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    console.error('Get All Offers Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch offers',
      error: error.message,
    });
  }
};

/**
 * GET /api/offers/portal-popup (Public Popup Offer for Main Web App)
 */
const getPortalPopupOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({ isVisibleOnPortal: true, status: 'Active' });

    return res.status(200).json({
      success: true,
      offer: offer || null,
    });
  } catch (error) {
    console.error('Get Portal Popup Offer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch portal popup offer',
    });
  }
};

/**
 * PUT /api/offers/:id (Update offer or toggle portal popup visibility)
 */
const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.isVisibleOnPortal) {
      await Offer.updateMany({ _id: { $ne: id } }, { isVisibleOnPortal: false });
    }

    const offer = await Offer.findByIdAndUpdate(id, updateData, { new: true });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer coupon not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Offer updated successfully!',
      offer,
    });
  } catch (error) {
    console.error('Update Offer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update offer',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/offers/:id
 */
const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    await Offer.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: 'Offer coupon deleted successfully!',
    });
  } catch (error) {
    console.error('Delete Offer Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete offer',
      error: error.message,
    });
  }
};

/**
 * POST /api/offers/validate (Public coupon validation for checkout)
 */
const validateCoupon = async (req, res) => {
  try {
    const { code, courseId, email } = req.body;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const offer = await Offer.findOne({ code: cleanCode, status: 'Active' });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: `Invalid or expired coupon code '${cleanCode}'`,
      });
    }

    // 1. Check couponType SPECIFIC_COURSE
    if (offer.couponType === 'SPECIFIC_COURSE' && offer.targetCourse) {
      if (courseId && offer.targetCourse.toString() !== courseId.toString()) {
        return res.status(400).json({
          success: false,
          message: `Coupon '${cleanCode}' is valid only for ${offer.targetCourseTitle || 'specific course'}.`,
        });
      }
    }

    // 2. Check couponType SPECIFIC_STUDENT
    if (offer.couponType === 'SPECIFIC_STUDENT' && offer.targetStudentEmail) {
      if (email && email.toLowerCase().trim() !== offer.targetStudentEmail.toLowerCase().trim()) {
        return res.status(400).json({
          success: false,
          message: `Coupon '${cleanCode}' is reserved for student ${offer.targetStudentEmail}`,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Coupon '${cleanCode}' applied successfully!`,
      offer: {
        code: offer.code,
        title: offer.title,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        minimumOrderAmount: offer.minimumOrderAmount || 0,
      },
    });
  } catch (error) {
    console.error('Validate Coupon Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate coupon code',
    });
  }
};

module.exports = {
  createOffer,
  getAllOffers,
  getPortalPopupOffer,
  updateOffer,
  deleteOffer,
  validateCoupon,
};
