const { Course } = require('../models/Course');

// GET /api/courses
const getAllCourses = async (req, res) => {
  try {
    const { category, search, status } = req.query;
    const query = {};
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
    const { title, category, duration, mode, level, badge, description, techStack, modules, careerOutcome, price, status } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Course title and description are required',
      });
    }

    const course = new Course({
      title,
      category: category || 'Development',
      duration: duration || '12 Weeks',
      mode: mode || 'Live Online + Capstone Labs',
      level: level || 'Beginner to Advanced',
      badge: badge || 'Popular',
      description,
      techStack: Array.isArray(techStack) ? techStack : typeof techStack === 'string' ? techStack.split(',').map(s => s.trim()) : [],
      modules: Array.isArray(modules) ? modules : typeof modules === 'string' ? modules.split('\n').map(s => s.trim()).filter(Boolean) : [],
      careerOutcome: careerOutcome || 'Full-Stack Software Engineer (₹8L – ₹18L PA)',
      price: price || 'Free & Industry Sponsored',
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
      updateData.techStack = updateData.techStack.split(',').map(s => s.trim());
    }
    if (typeof updateData.modules === 'string') {
      updateData.modules = updateData.modules.split('\n').map(s => s.trim()).filter(Boolean);
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
    const course = await Course.findByIdAndDelete(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Course '${course.title}' deleted successfully`,
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
