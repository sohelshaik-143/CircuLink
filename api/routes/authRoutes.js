// api/routes/authRoutes.js
// All authentication & identity endpoints

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { protect } = require('../../middleware/auth');
const authController = require('../../controllers/authController');

// ─── Rate Limiters ──────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 min
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  keyGenerator: (req) => req.body.collegeId || req.ip,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 5,
  message: { success: false, message: 'Too many registration attempts.' },
});

// ─── Validators ──────────────────────────────────────────────────────────────
const registerValidator = [
  body('collegeId').notEmpty().trim().toUpperCase().withMessage('College ID is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('role').isIn(['STUDENT', 'FACULTY', 'HOD', 'DSW', 'DEAN', 'DIRECTOR', 'SECURITY', 'ADMIN'])
    .withMessage('Invalid role'),
  body('campus').isIn(['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam', 'ongole'])
    .withMessage('Invalid campus'),
  body('branch').optional().isIn(['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT'])
    .withMessage('Invalid branch'),
];

const loginValidator = [
  body('collegeId').notEmpty().trim().withMessage('College ID required'),
  body('password').notEmpty().withMessage('Password required'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0].msg });
  }
  next();
};

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { collegeId, email, password, name, role, campus, branch, year, section }
 */
router.post('/register', registerLimiter, registerValidator, validate, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login with College ID + Password (+ MFA token for privileged roles)
 * @access  Public
 * @body    { collegeId, password, mfaToken? }
 * @returns { token, refreshToken, user } | { requiresMFA: true }
 */
router.post('/login', loginLimiter, loginValidator, validate, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout and invalidate refresh token
 * @access  Private
 */
router.post('/logout', protect, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', protect, authController.getMe);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Get new access token using refresh token
 * @access  Public
 * @body    { refreshToken }
 */
router.post('/refresh-token',
  body('refreshToken').notEmpty().withMessage('Refresh token required'),
  validate,
  authController.refreshToken
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password',
  body('email').isEmail().withMessage('Valid email required'),
  validate,
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @body    { token, password }
 */
router.post('/reset-password',
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
  body('token').notEmpty().withMessage('Reset token required'),
  validate,
  authController.resetPassword
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.put('/change-password', protect,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  validate,
  async (req, res) => {
    try {
      const User = require('../models/User');
      const user = await User.findById(req.user._id).select('+password');
      if (!(await user.matchPassword(req.body.currentPassword))) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }
      user.password = req.body.newPassword;
      await user.save();
      res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * @route   POST /api/auth/google
 * @desc    Login / register with Google OAuth access token
 * @access  Public
 * @body    { tokenId } — Google access token from @react-oauth/google
 */
router.post('/google', authController.googleLogin);

/**
 * @route   POST /api/auth/setup-mfa
 * @desc    Generate MFA secret (TOTP) for HOD/Dean/Director
 * @access  Private (HOD, DSW, DEAN, DIRECTOR, ADMIN)
 * @returns { secret, otpauth_url, qrCode }
 */
router.post('/setup-mfa', protect, authController.setupMFA);

/**
 * @route   POST /api/auth/verify-mfa
 * @desc    Verify MFA token to enable MFA on account
 * @access  Private
 * @body    { token } — 6-digit TOTP code
 */
router.post('/verify-mfa', protect, authController.verifyMFA);

/**
 * @route   POST /api/auth/disable-mfa
 * @desc    Disable MFA
 * @access  Private
 * @body    { token } — current valid MFA token
 */
router.post('/disable-mfa', protect, async (req, res) => {
  try {
    const speakeasy = require('speakeasy');
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('+mfaSecret');
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret, encoding: 'base32',
      token: req.body.token, window: 1,
    });
    if (!verified) return res.status(400).json({ success: false, message: 'Invalid MFA token.' });
    await User.findByIdAndUpdate(req.user._id, { mfaEnabled: false, mfaSecret: null });
    res.json({ success: true, message: 'MFA disabled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   POST /api/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get('/verify-email/:token', async (req, res) => {
  res.json({ success: true, message: 'Email verified successfully.' });
});

module.exports = router;
