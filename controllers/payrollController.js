const { Payroll, PAYROLL_CATEGORIES, PAYMENT_STATUSES } = require('../models/Payroll');
const { Employee } = require('../models/Employee');

/**
 * GET /api/payroll
 * Query filters: category, month, year, paymentStatus, search
 */
const getPayrolls = async (req, res) => {
  try {
    const { category, month, year, paymentStatus, search } = req.query;
    const query = { isDeleted: { $ne: true } };

    if (category && category !== 'All') {
      query.category = category;
    }
    if (month && month !== 'All') {
      query.month = month;
    }
    if (year && year !== 'All') {
      query.year = Number(year);
    }
    if (paymentStatus && paymentStatus !== 'All') {
      query.paymentStatus = paymentStatus;
    }
    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { recipientName: { $regex: q, $options: 'i' } },
        { recipientEmail: { $regex: q, $options: 'i' } },
        { payrollId: { $regex: q, $options: 'i' } },
        { roleDesignation: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
      ];
    }

    const records = await Payroll.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      payrolls: records,
    });
  } catch (error) {
    console.error('[Payroll Controller] getPayrolls Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payroll records',
      error: error.message,
    });
  }
};

/**
 * GET /api/payroll/stats
 * Aggregate financial metrics across categories
 */
const getPayrollStats = async (req, res) => {
  try {
    const baseQuery = { isDeleted: { $ne: true } };
    const allRecords = await Payroll.find(baseQuery);

    let totalDisbursed = 0;
    let pendingPayout = 0;
    let processingPayout = 0;
    let paidCount = 0;
    let pendingCount = 0;

    let orgTotal = 0;
    let studentTotal = 0;
    let itSolutionTotal = 0;

    allRecords.forEach((item) => {
      const net = item.netSalary || 0;
      if (item.paymentStatus === 'Paid') {
        totalDisbursed += net;
        paidCount++;
      } else if (item.paymentStatus === 'Pending') {
        pendingPayout += net;
        pendingCount++;
      } else if (item.paymentStatus === 'Processing') {
        processingPayout += net;
      }

      if (item.category === 'org-employee') orgTotal += net;
      else if (item.category === 'student') studentTotal += net;
      else if (item.category === 'it-solution') itSolutionTotal += net;
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalDisbursed,
        pendingPayout,
        processingPayout,
        paidCount,
        pendingCount,
        totalRecords: allRecords.length,
        categoryBreakdown: {
          orgEmployee: orgTotal,
          student: studentTotal,
          itSolution: itSolutionTotal,
        },
      },
    });
  } catch (error) {
    console.error('[Payroll Controller] getPayrollStats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate payroll statistics',
      error: error.message,
    });
  }
};

/**
 * GET /api/payroll/:id
 */
const getPayrollById = async (req, res) => {
  try {
    const record = await Payroll.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }
    return res.status(200).json({ success: true, payroll: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * POST /api/payroll
 * Create a new payroll entry
 */
const createPayroll = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.recipientName || !payload.recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Recipient name and email are required',
      });
    }

    const newPayroll = new Payroll(payload);
    await newPayroll.save();

    return res.status(201).json({
      success: true,
      message: `Payroll entry created successfully for ${newPayroll.recipientName}`,
      payroll: newPayroll,
    });
  } catch (error) {
    console.error('[Payroll Controller] createPayroll Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payroll record',
      error: error.message,
    });
  }
};

/**
 * PUT /api/payroll/:id
 */
const updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const record = await Payroll.findById(id);
    if (!record || record.isDeleted) {
      return res.status(404).json({ success: false, message: 'Payroll entry not found' });
    }

    Object.assign(record, updates);
    await record.save();

    return res.status(200).json({
      success: true,
      message: 'Payroll entry updated successfully',
      payroll: record,
    });
  } catch (error) {
    console.error('[Payroll Controller] updatePayroll Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payroll entry',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/payroll/:id/status
 * Update payment status & transaction metadata
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, transactionId, paymentMethod, paymentDate, remarks } = req.body;

    const record = await Payroll.findById(id);
    if (!record || record.isDeleted) {
      return res.status(404).json({ success: false, message: 'Payroll entry not found' });
    }

    if (paymentStatus) record.paymentStatus = paymentStatus;
    if (transactionId !== undefined) record.transactionId = transactionId;
    if (paymentMethod) record.paymentMethod = paymentMethod;
    if (paymentDate) record.paymentDate = paymentDate;
    if (paymentStatus === 'Paid' && !record.paymentDate) record.paymentDate = new Date();
    if (remarks !== undefined) record.remarks = remarks;

    await record.save();

    return res.status(200).json({
      success: true,
      message: `Payment status updated to ${record.paymentStatus}`,
      payroll: record,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/payroll/:id
 * Soft delete (moves to Recycle Bin)
 */
const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Payroll.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Payroll entry not found' });
    }

    record.isDeleted = true;
    record.deletedAt = new Date();
    await record.save();

    return res.status(200).json({
      success: true,
      message: 'Payroll entry moved to Recycle Bin',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to remove payroll record',
      error: error.message,
    });
  }
};

module.exports = {
  getPayrolls,
  getPayrollStats,
  getPayrollById,
  createPayroll,
  updatePayroll,
  updatePaymentStatus,
  deletePayroll,
};
