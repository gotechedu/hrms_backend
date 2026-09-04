const { Course } = require('../models/Course');

// GET /api/courses
const getAllCourses = async (req, res) => {
  try {
    const { category, search, status } = req.query;
    const query = { isDeleted: { $ne: true } };
    if (category && category !== 'All') {
      query.category = category;
    }
    if (status && status !== 'All') {
      query.status = status;
    }
    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { techStack: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    const courses = await Course.find(query).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    console.error('Get All Courses Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving courses',
      error: error.message,
    });
  }
};

// GET /api/courses/:id
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    let course;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      course = await Course.findById(id);
    } else {
      course = await Course.findOne({ slug: id });
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error('Get Course By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving course details',
      error: error.message,
    });
  }
};

// POST /api/courses
const createCourse = async (req, res) => {
  try {
    const {
      title,
      category,
      image,
      previewImage,
      thumbnail,
      bannerImage,
      heroTagline,
      duration,
      totalHours,
      lecturesCount,
      nextBatchDate,
      averageSalaryHike,
      rating,
      reviewsCount,
      enrolledStudents,
      mode,
      level,
      badge,
      color,
      bgSoft,
      textCol,
      borderCol,
      description,
      overviewParagraph,
      whatYouWillLearn,
      prerequisites,
      techStack,
      modules,
      syllabusModules,
      careerOutcome,
      price,
      originalPrice,
      discountedPrice,
      emiStartsAt,
      offers,
      instructor,
      instructors,
      faqs,
      status,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Course title and description are required',
      });
    }

    const courseImg = image || previewImage || thumbnail || bannerImage || '';

    const course = new Course({
      title,
      category: category || 'Development',
      image: courseImg,
      previewImage: previewImage || courseImg,
      thumbnail: thumbnail || courseImg,
      bannerImage: bannerImage || courseImg,
      heroTagline: heroTagline || '',
      duration: duration || '16 Weeks',
      totalHours: totalHours || '120+ Hours',
      lecturesCount: Number(lecturesCount) || 60,
      nextBatchDate: nextBatchDate || 'Upcoming Cohort 2026',
      averageSalaryHike: averageSalaryHike || '70%',
      rating: Number(rating) || 4.88,
      reviewsCount: Number(reviewsCount) || 1250,
      enrolledStudents: Number(enrolledStudents) || 3500,
      mode: mode || 'Live Online + Capstone Labs',
      level: level || 'Beginner to Advanced',
      badge: badge || 'Popular',
      color: color || 'from-blue-600 to-cyan-500',
      bgSoft: bgSoft || 'bg-blue-50',
      textCol: textCol || 'text-blue-600',
      borderCol: borderCol || 'border-blue-100',
      description,
      overviewParagraph: overviewParagraph || description,
      whatYouWillLearn: Array.isArray(whatYouWillLearn)
        ? whatYouWillLearn
        : typeof whatYouWillLearn === 'string'
        ? whatYouWillLearn.split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
      prerequisites: Array.isArray(prerequisites)
        ? prerequisites
        : typeof prerequisites === 'string'
        ? prerequisites.split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
      techStack: Array.isArray(techStack)
        ? techStack
        : typeof techStack === 'string'
        ? techStack.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      modules: Array.isArray(modules)
        ? modules
        : typeof modules === 'string'
        ? modules.split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
      syllabusModules: Array.isArray(syllabusModules) ? syllabusModules : [],
      careerOutcome: careerOutcome || 'Full-Stack Software Engineer (₹8L – ₹18L PA)',
      price: price || 'Free & Industry Sponsored',
      originalPrice: Number(originalPrice) || 49999,
      discountedPrice: Number(discountedPrice) || 24999,
      emiStartsAt: Number(emiStartsAt) || 2083,
      offers: Array.isArray(offers) ? offers : [],
      instructor: instructor || {
        name: 'Dr. Vikram Sharma',
        role: 'Lead Full-Stack Architect',
        organization: 'GoTechEdu Labs',
      },
      instructors: Array.isArray(instructors) ? instructors : [],
      faqs: Array.isArray(faqs) ? faqs : [],
      status: status || 'Active',
    });

    await course.save();

    return res.status(201).json({
      success: true,
      message: 'Course program published successfully',
      course,
    });
  } catch (error) {
    console.error('Create Course Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating course',
      error: error.message,
    });
  }
};

// PUT /api/courses/:id
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (typeof updateData.techStack === 'string') {
      updateData.techStack = updateData.techStack.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (typeof updateData.modules === 'string') {
      updateData.modules = updateData.modules.split('\n').map((s) => s.trim()).filter(Boolean);
    }
    if (typeof updateData.whatYouWillLearn === 'string') {
      updateData.whatYouWillLearn = updateData.whatYouWillLearn.split('\n').map((s) => s.trim()).filter(Boolean);
    }
    if (typeof updateData.prerequisites === 'string') {
      updateData.prerequisites = updateData.prerequisites.split('\n').map((s) => s.trim()).filter(Boolean);
    }

    if (updateData.image || updateData.previewImage || updateData.thumbnail || updateData.bannerImage) {
      const img = updateData.image || updateData.previewImage || updateData.thumbnail || updateData.bannerImage;
      if (!updateData.image) updateData.image = img;
      if (!updateData.previewImage) updateData.previewImage = img;
      if (!updateData.thumbnail) updateData.thumbnail = img;
      if (!updateData.bannerImage) updateData.bannerImage = img;
    }

    const course = await Course.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      course,
    });
  } catch (error) {
    console.error('Update Course Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating course',
      error: error.message,
    });
  }
};

// DELETE /api/courses/:id
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    course.isDeleted = true;
    course.deletedAt = new Date();
    await course.save();

    return res.status(200).json({
      success: true,
      message: `Course '${course.title}' moved to Recycle Bin`,
    });
  } catch (error) {
    console.error('Delete Course Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting course',
      error: error.message,
    });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
