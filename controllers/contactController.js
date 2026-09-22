const { ContactInquiry } = require('../models/ContactInquiry');

/**
 * POST /api/contacts
 * Public endpoint - website visitors submit consultation inquiries
 */
const submitContactInquiry = async (req, res) => {
  try {
    const { fullName, email, phone, company, service, budget, message, source } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required',
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Valid work email is required',
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Contact phone number is required',
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project scope description is required',
      });
    }

    const inquiry = new ContactInquiry({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      company: company ? company.trim() : '',
      service: service || 'Enterprise Software (ERP/CRM/POS)',
      budget: budget || '$10,000 – $50,000',
      message: message.trim(),
      source: source || 'Official Portal Contact Form',
      status: 'New',
      priority: 'Medium',
    });

    await inquiry.save();

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your technical consultation request has been submitted successfully.',
      referenceId: inquiry._id,
    });
  } catch (error) {
    console.error('[ContactController] submitContactInquiry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit consultation request. Please try again or reach out directly.',
    });
  }
};

/**
 * GET /api/contacts
 * Protected endpoint - HRMS staff lists and filters client consultation requests
 */
const getAllContactInquiries = async (req, res) => {
  try {
    const { status, service, priority, search, page = 1, limit = 50 } = req.query;

    const filter = { isDeleted: false };

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (service && service !== 'All') {
      filter.service = service;
    }

    if (priority && priority !== 'All') {
      filter.priority = priority;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { message: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [inquiries, totalCount] = await Promise.all([
      ContactInquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .populate('assignedTo', 'firstName lastName email designation')
        .lean(),
      ContactInquiry.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: inquiries.length,
      total: totalCount,
      page: parseInt(page, 10),
      totalPages: Math.ceil(totalCount / take) || 1,
      inquiries,
    });
  } catch (error) {
    console.error('[ContactController] getAllContactInquiries error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve contact inquiries',
      error: error.message,
    });
  }
};

/**
 * GET /api/contacts/stats
 * Protected endpoint - quick metrics for HRMS overview cards
 */
const getContactStats = async (req, res) => {
  try {
    const [total, newCount, inDiscussionCount, convertedCount, contactedCount] = await Promise.all([
      ContactInquiry.countDocuments({ isDeleted: false }),
      ContactInquiry.countDocuments({ isDeleted: false, status: 'New' }),
      ContactInquiry.countDocuments({ isDeleted: false, status: { $in: ['In Discussion', 'Proposal Sent'] } }),
      ContactInquiry.countDocuments({ isDeleted: false, status: 'Converted' }),
      ContactInquiry.countDocuments({ isDeleted: false, status: 'Contacted' }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        new: newCount,
        contacted: contactedCount,
        inDiscussion: inDiscussionCount,
        converted: convertedCount,
      },
    });
  } catch (error) {
    console.error('[ContactController] getContactStats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve contact statistics',
      error: error.message,
    });
  }
};

/**
 * GET /api/contacts/:id
 * Protected endpoint - get single inquiry by ID
 */
const getContactInquiryById = async (req, res) => {
  try {
    const inquiry = await ContactInquiry.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate('assignedTo', 'firstName lastName email designation department');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Contact inquiry not found',
      });
    }

    return res.status(200).json({
      success: true,
      inquiry,
    });
  } catch (error) {
    console.error('[ContactController] getContactInquiryById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contact inquiry details',
      error: error.message,
    });
  }
};

/**
 * PUT /api/contacts/:id
 * Protected endpoint - update status, priority, assigned employee, or append notes
 */
const updateContactInquiry = async (req, res) => {
  try {
    const { status, priority, assignedTo, assignedToName, note } = req.body;

    const inquiry = await ContactInquiry.findById(req.params.id);

    if (!inquiry || inquiry.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Contact inquiry not found',
      });
    }

    if (status) {
      inquiry.status = status;
    }

    if (priority) {
      inquiry.priority = priority;
    }

    if (assignedTo !== undefined) {
      inquiry.assignedTo = assignedTo || null;
    }

    if (assignedToName !== undefined) {
      inquiry.assignedToName = assignedToName || '';
    }

    if (note && note.trim()) {
      inquiry.adminNotes.push({
        note: note.trim(),
        author: req.user ? `${req.user.name || req.user.email} (${req.user.role || 'Staff'})` : 'Admin',
        createdAt: new Date(),
      });
    }

    await inquiry.save();

    return res.status(200).json({
      success: true,
      message: 'Contact inquiry updated successfully',
      inquiry,
    });
  } catch (error) {
    console.error('[ContactController] updateContactInquiry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update contact inquiry',
      error: error.message,
    });
  }
};

/**
 * POST /api/contacts/manual
 * Protected endpoint - HRMS staff creates an inquiry manually (e.g. offline lead or direct phone call)
 */
const createManualInquiry = async (req, res) => {
  try {
    const { fullName, email, phone, company, service, budget, message, status, priority, note } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and phone are required',
      });
    }

    const inquiry = new ContactInquiry({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      company: company || '',
      service: service || 'Enterprise Software (ERP/CRM/POS)',
      budget: budget || '$10,000 – $50,000',
      message: message || 'Direct consultation logged by HRMS staff',
      source: 'HRMS Manual Entry',
      status: status || 'New',
      priority: priority || 'Medium',
      adminNotes: note ? [{
        note: note.trim(),
        author: req.user ? `${req.user.name || req.user.email}` : 'Staff',
        createdAt: new Date(),
      }] : [],
    });

    await inquiry.save();

    return res.status(201).json({
      success: true,
      message: 'Inquiry registered successfully in HRMS',
      inquiry,
    });
  } catch (error) {
    console.error('[ContactController] createManualInquiry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register manual inquiry',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/contacts/:id
 * Protected endpoint - soft deletes contact inquiry to send it to Universal Recycle Bin
 */
const deleteContactInquiry = async (req, res) => {
  try {
    const inquiry = await ContactInquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Contact inquiry not found',
      });
    }

    if (req.query.permanent === 'true' || inquiry.isDeleted) {
      await ContactInquiry.findByIdAndDelete(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Contact inquiry permanently deleted',
      });
    }

    // Soft delete to Recycle Bin
    inquiry.isDeleted = true;
    inquiry.deletedAt = new Date();
    await inquiry.save();

    return res.status(200).json({
      success: true,
      message: 'Contact inquiry moved to Recycle Bin',
    });
  } catch (error) {
    console.error('[ContactController] deleteContactInquiry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete contact inquiry',
      error: error.message,
    });
  }
};

module.exports = {
  submitContactInquiry,
  getAllContactInquiries,
  getContactStats,
  getContactInquiryById,
  updateContactInquiry,
  createManualInquiry,
  deleteContactInquiry,
};
