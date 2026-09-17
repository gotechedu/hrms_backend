const express = require("express");
const router = express.Router();
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController");
const { protect, checkAnyPermission } = require("../middleware/authMiddleware");

// Public routes (used by official website & HRMS)
router.get("/", getAllCourses);
router.get("/:id", getCourseById);

// Protected routes (HRMS roles with learninghub permissions)
router.post(
  "/",
  protect,
  checkAnyPermission("manage_learninghub", "create_course"),
  createCourse,
);
router.put(
  "/:id",
  protect,
  checkAnyPermission("manage_learninghub", "update_course", "edit_course"),
  updateCourse,
);
router.delete(
  "/:id",
  protect,
  checkAnyPermission("manage_learninghub", "delete_course"),
  deleteCourse,
);

module.exports = router;
