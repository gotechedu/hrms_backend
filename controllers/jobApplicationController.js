const { JobApplication } = require('../models/JobApplication');
const { Job } = require('../models/Job');

// POST /api/job-applications (Public - submitted by candidate on official website)
const submitJobApplication = async (req, res) => {
  try {
    const {
      jobId,
      jobTitle,
      department,
      name,
      email,
      phone,
      experience,
      currentCompany,
      expectedCTC,
      noticePeriod,
      resumeUrl,
      portfolioUrl,
      coverLetter,
    } = req.body;

    if (!name || !email || !phone || !jobTitle) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and job title are required',
      });
    }

    const application = new JobApplication({
      job: jobId || null,
      jobTitle,
      department: department || 'Engineering',
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      experience: experience || '1–3 Years',
      currentCompany: currentCompany || '',
      expectedCTC: expectedCTC || '',
      noticePeriod: noticePeriod || '30 Days',
      resumeUrl: resumeUrl || '',
      portfolioUrl: portfolioUrl || '',
      coverLetter: coverLetter || '',
      stage: 'Applied',
    });

    await application.save();

    // Increment applicantsCount in Job if linked
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, { $inc: { applicantsCount: 1 } });
    }

    return res.status(201).json({
      success: true,
      message: 'Your job application has been successfully submitted! Our talent acquisition team will review your profile.',
      application,
    });
  } catch (error) {
    console.error('Submit Job Application Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error submitting job application',
      error: error.message,
    });
  }
};

// GET /api/job-applications (Protected - viewed in HRMS)
const getAllJobApplications = async (req, res) => {
  try {
    const { stage, department, search } = req.query;
    const query = {};

    if (stage && stage !== 'All') {
      query.stage = stage;
    }
    if (department && department !== 'All') {
      query.department = department;
    }
    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { jobTitle: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    const applications = await JobApplication.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error('Get Job Applications Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving job applications',
      error: error.message,
    });
  }
};

// PUT /api/job-applications/:id
const updateJobApplicationStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, rating, notes } = req.body;

    const application = await JobApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Job application not found',
      });
    }

    if (stage) application.stage = stage;
    if (rating !== undefined) application.rating = rating;
    if (notes !== undefined) application.notes = notes;

    await application.save();

    return res.status(200).json({
      success: true,
      message: `Applicant status updated to '${application.stage}'`,
      application,
    });
  } catch (error) {
    console.error('Update Job Application Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating applicant status',
      error: error.message,
    });
  }
};

// DELETE /api/job-applications/:id
const deleteJobApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await JobApplication.findByIdAndDelete(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Job application not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate application removed from pipeline',
    });
  } catch (error) {
    console.error('Delete Job Application Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting candidate application',
      error: error.message,
    });
  }
};

module.exports = {
  submitJobApplication,
  getAllJobApplications,
  updateJobApplicationStage,
  deleteJobApplication,
};
