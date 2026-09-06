const mongoose = require('mongoose');
const { Course } = require('../models/Course');
const { Module } = require('../models/Module');
const { Lesson } = require('../models/Lesson');
const { AuditLog } = require('../models/AuditLog');

/**
 * GET /api/curriculum/course/:courseId
 * Retrieve full ordered curriculum (modules + lessons) for a course
 */
const getCourseCurriculum = async (req, res) => {
  try {
    const { courseId } = req.params;
    let targetCourse;
    if (mongoose.Types.ObjectId.isValid(courseId)) {
      targetCourse = await Course.findById(courseId);
    } else {
      targetCourse = await Course.findOne({ slug: courseId });
    }

    if (!targetCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const modules = await Module.find({ course: targetCourse._id }).sort({ order: 1 });
    const moduleIds = modules.map((m) => m._id);
    const lessons = await Lesson.find({ module: { $in: moduleIds } }).sort({ order: 1 });

    const curriculum = modules.map((mod) => ({
      ...mod.toObject(),
      lessons: lessons.filter((l) => l.module.toString() === mod._id.toString()),
    }));

    return res.status(200).json({
      success: true,
      courseId: targetCourse._id,
      courseTitle: targetCourse.title,
      count: modules.length,
      curriculum,
    });
  } catch (error) {
    console.error('Get Course Curriculum Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving curriculum',
      error: error.message,
    });
  }
};

/**
 * POST /api/curriculum/modules
 * Create a new module inside a course
 */
const createModule = async (req, res) => {
  try {
    const { courseId, title, description, duration, learningObjectives, order } = req.body;

    if (!courseId || !title) {
      return res.status(400).json({
        success: false,
        message: 'courseId and module title are required',
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    let moduleOrder = order;
    if (moduleOrder === undefined) {
      const lastMod = await Module.findOne({ course: course._id }).sort({ order: -1 });
      moduleOrder = lastMod ? lastMod.order + 1 : 1;
    }

    const newModule = await Module.create({
      course: course._id,
      title: title.trim(),
      description: description || '',
      duration: duration || '1 Week',
      learningObjectives: Array.isArray(learningObjectives) ? learningObjectives : [],
      order: moduleOrder,
      isPublished: true,
    });

    // Also update course.modules array for legacy compatibility
    await Course.findByIdAndUpdate(course._id, {
      $addToSet: { modules: newModule.title },
    });

    if (req.user) {
      await AuditLog.create({
        actor: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'MODULE_CREATED',
        entity: 'Module',
        entityId: newModule._id.toString(),
        metadata: { courseId: course._id, title: newModule.title },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Module created successfully',
      module: {
        ...newModule.toObject(),
        lessons: [],
      },
    });
  } catch (error) {
    console.error('Create Module Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating module',
      error: error.message,
    });
  }
};

/**
 * PUT /api/curriculum/modules/:moduleId
 * Update module details
 */
const updateModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, description, duration, learningObjectives, order, isPublished } = req.body;

    const existingMod = await Module.findById(moduleId);
    if (!existingMod) {
      return res.status(404).json({
        success: false,
        message: 'Module not found',
      });
    }

    if (title) existingMod.title = title.trim();
    if (description !== undefined) existingMod.description = description;
    if (duration !== undefined) existingMod.duration = duration;
    if (learningObjectives !== undefined) existingMod.learningObjectives = learningObjectives;
    if (order !== undefined) existingMod.order = Number(order);
    if (isPublished !== undefined) existingMod.isPublished = Boolean(isPublished);

    await existingMod.save();

    return res.status(200).json({
      success: true,
      message: 'Module updated successfully',
      module: existingMod,
    });
  } catch (error) {
    console.error('Update Module Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating module',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/curriculum/modules/:moduleId
 * Delete module and its associated lessons
 */
const deleteModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const existingMod = await Module.findById(moduleId);
    if (!existingMod) {
      return res.status(404).json({
        success: false,
        message: 'Module not found',
      });
    }

    // Delete associated lessons
    const deletedLessons = await Lesson.deleteMany({ module: moduleId });
    await Module.findByIdAndDelete(moduleId);

    // Remove from Course modules array
    await Course.findByIdAndUpdate(existingMod.course, {
      $pull: { modules: existingMod.title },
    });

    return res.status(200).json({
      success: true,
      message: `Module deleted along with ${deletedLessons.deletedCount} lessons`,
    });
  } catch (error) {
    console.error('Delete Module Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting module',
      error: error.message,
    });
  }
};

/**
 * POST /api/curriculum/modules/reorder
 * Reorder modules inside a course
 */
const reorderModules = async (req, res) => {
  try {
    const { orderedModuleIds } = req.body;
    if (!Array.isArray(orderedModuleIds) || orderedModuleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderedModuleIds array is required',
      });
    }

    const bulkOps = orderedModuleIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    }));

    await Module.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: 'Modules reordered successfully',
    });
  } catch (error) {
    console.error('Reorder Modules Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error reordering modules',
      error: error.message,
    });
  }
};

/**
 * POST /api/curriculum/lessons
 * Create a new lesson inside a module
 */
const createLesson = async (req, res) => {
  try {
    const {
      courseId,
      moduleId,
      title,
      description,
      duration,
      contentType,
      videoUrl,
      videoProvider,
      contentBody,
      documentUrl,
      externalUrl,
      resources,
      isPreview,
      isRequired,
      order,
    } = req.body;

    if (!moduleId || !title) {
      return res.status(400).json({
        success: false,
        message: 'moduleId and lesson title are required',
      });
    }

    const moduleDoc = await Module.findById(moduleId);
    if (!moduleDoc) {
      return res.status(404).json({
        success: false,
        message: 'Module not found',
      });
    }

    const finalCourseId = courseId || moduleDoc.course;

    let lessonOrder = order;
    if (lessonOrder === undefined) {
      const lastLesson = await Lesson.findOne({ module: moduleId }).sort({ order: -1 });
      lessonOrder = lastLesson ? lastLesson.order + 1 : 1;
    }

    const newLesson = await Lesson.create({
      course: finalCourseId,
      module: moduleId,
      title: title.trim(),
      description: description || '',
      duration: duration || '30 mins',
      contentType: contentType || 'video',
      videoUrl: videoUrl || '',
      videoProvider: videoProvider || 'youtube',
      contentBody: contentBody || '',
      documentUrl: documentUrl || '',
      externalUrl: externalUrl || '',
      resources: Array.isArray(resources) ? resources : [],
      isPreview: Boolean(isPreview),
      isRequired: isRequired !== undefined ? Boolean(isRequired) : true,
      order: lessonOrder,
      isPublished: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      lesson: newLesson,
    });
  } catch (error) {
    console.error('Create Lesson Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating lesson',
      error: error.message,
    });
  }
};

/**
 * PUT /api/curriculum/lessons/:lessonId
 * Update lesson details
 */
const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const allowedFields = [
      'title',
      'description',
      'duration',
      'contentType',
      'videoUrl',
      'videoProvider',
      'contentBody',
      'documentUrl',
      'externalUrl',
      'resources',
      'isPreview',
      'isRequired',
      'isPublished',
      'order',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        lesson[field] = req.body[field];
      }
    });

    await lesson.save();

    return res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      lesson,
    });
  } catch (error) {
    console.error('Update Lesson Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating lesson',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/curriculum/lessons/:lessonId
 * Delete a lesson
 */
const deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await Lesson.findByIdAndDelete(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully',
    });
  } catch (error) {
    console.error('Delete Lesson Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting lesson',
      error: error.message,
    });
  }
};

/**
 * POST /api/curriculum/lessons/reorder
 * Reorder lessons inside a module
 */
const reorderLessons = async (req, res) => {
  try {
    const { orderedLessonIds } = req.body;
    if (!Array.isArray(orderedLessonIds) || orderedLessonIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderedLessonIds array is required',
      });
    }

    const bulkOps = orderedLessonIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    }));

    await Lesson.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: 'Lessons reordered successfully',
    });
  } catch (error) {
    console.error('Reorder Lessons Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error reordering lessons',
      error: error.message,
    });
  }
};

/**
 * GET /api/curriculum/lessons/:lessonId/preview
 * Public access to preview lesson without authentication
 */
const getLessonPublicPreview = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    if (!lesson.isPreview) {
      return res.status(403).json({
        success: false,
        message: 'This lesson is not available for free preview. Please enroll in the course to access it.',
      });
    }

    return res.status(200).json({
      success: true,
      lesson: {
        _id: lesson._id,
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        contentType: lesson.contentType,
        videoUrl: lesson.videoUrl,
        videoProvider: lesson.videoProvider,
        contentBody: lesson.contentBody,
        isPreview: true,
      },
    });
  } catch (error) {
    console.error('Get Lesson Preview Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving preview lesson',
      error: error.message,
    });
  }
};

module.exports = {
  getCourseCurriculum,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  getLessonPublicPreview,
};
