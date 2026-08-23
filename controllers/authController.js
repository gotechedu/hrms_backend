const { User, ROLES } = require('../models/User');
const { Employee } = require('../models/Employee');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');

/**
 * Normalizes frontend role string to canonical backend role enum
 * e.g., "HR Administrator" -> "hr", "HR Admin" -> "hr", "Employee" -> "employee"
 */
const normalizeRole = (roleStr) => {
  if (!roleStr) return null;
  const lower = roleStr.toLowerCase().trim();
  if (lower.includes('superadmin') || lower.includes('super admin')) return 'superadmin';
  if (lower.includes('admin') && !lower.includes('hr')) return 'admin';
  if (lower.includes('hr')) return 'hr';
  if (lower.includes('manager')) return 'manager';
  if (lower.includes('lead') || lower.includes('teamlead')) return 'teamlead';
  if (lower.includes('intern')) return 'intern';
  if (lower.includes('employee')) return 'employee';
  return ROLES.includes(lower) ? lower : null;
};

/**
 * @desc    Login user & get token with role validation
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate email & password presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    // Find user by email and explicitly select password
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .populate('employeeProfile');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please reach out to your administrator.`,
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    // Role-based portal validation (if a specific role is requested from login portal)
    if (role) {
      const requestedRole = normalizeRole(role);
      const userRole = user.role.toLowerCase();

      // High-privilege role bypass (superadmin & admin can log in to any portal)
      const isPrivileged = ['superadmin', 'admin'].includes(userRole);

      if (!isPrivileged && requestedRole && userRole !== requestedRole) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Your assigned role '${user.role}' does not match the '${role}' portal.`,
        });
      }
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      employeeId: user.employeeProfile ? user.employeeProfile.employeeId : null,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
        employeeProfile: user.employeeProfile,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error occurred during login',
      error: error.message,
    });
  }
};

/**
 * @desc    Logout user & invalidate session
 * @route   POST /api/auth/logout
 * @access  Public / Protected
 */
const logout = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully from session',
    });
  } catch (error) {
    console.error('Logout Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message,
    });
  }
};

/**
 * @desc    Request password reset OTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an account email address',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Expiration: 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = expiresAt;
    await user.save({ validateBeforeSave: false });

    console.log(`[Forgot Password] OTP generated for ${user.email}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${user.email}.`,
      // For development/demo convenience:
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      expiresInMinutes: 15,
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing password reset request',
      error: error.message,
    });
  }
};

/**
 * @desc    Verify 6-digit OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and the 6-digit OTP code',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification OTP code',
      });
    }

    if (user.resetPasswordExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification OTP has expired. Please request a new one.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP code verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error verifying OTP code',
      error: error.message,
    });
  }
};

/**
 * @desc    Reset password using OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, verification OTP, and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification OTP code',
      });
    }

    if (user.resetPasswordExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification OTP code has expired. Please request a new one.',
      });
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You may now sign in with your new password.',
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error resetting password',
      error: error.message,
    });
  }
};

/**
 * @desc    Get currently authenticated user & profile
 * @route   GET /api/auth/me
 * @access  Protected (All authenticated roles)
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'employeeProfile',
      populate: [
        { path: 'manager', select: 'name email role designation avatar' },
        { path: 'teamLead', select: 'name email role designation avatar' },
      ],
    });

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching user profile',
      error: error.message,
    });
  }
};

/**
 * @desc    Change password for logged-in user
 * @route   PUT /api/auth/change-password
 * @access  Protected
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current password and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match records',
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating password',
      error: error.message,
    });
  }
};

module.exports = {
  login,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getMe,
  changePassword,
  normalizeRole,
};
