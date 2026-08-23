const express = require("express");
const router = express.Router();
const {
  login,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getMe,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public authentication routes
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

// Protected routes (require valid JWT)
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePassword);

module.exports = router;
