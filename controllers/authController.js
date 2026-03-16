const User = require('../models/User');
const { AuditLog } = require('../models/Other');
const auth = require('../middleware/auth');
const speakeasy = require('speakeasy');
const { OAuth2Client } = require('google-auth-library');

// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { collegeId, email, password, name, role, branch, campus, year, section } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { collegeId }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this ID or email already exists.' });
    }

    const user = await User.create({ collegeId, email, password, name, role, branch, campus, year, section });

    await AuditLog.create({
      user: user._id, action: 'REGISTER',
      resourceType: 'User', resourceId: user._id,
      details: { role, campus, branch },
      ipAddress: req.ip,
    });

    const token = auth.generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        _id: user._id, collegeId: user.collegeId, name: user.name,
        email: user.email, role: user.role, branch: user.branch,
        campus: user.campus, points: user.points, level: user.level,
      },
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// @route   POST /api/auth/google
exports.googleLogin = async (req, res) => {
  try {
    const { tokenId } = req.body;
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, sub: googleId, picture } = ticket.getAttributes().payload;

    if (!email.endsWith('@rgukt.ac.in') && !email.includes('.ac.in')) {
      return res.status(400).json({ success: false, message: 'Only @rgukt.ac.in accounts are allowed.' });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // Create new student user if not exists
      // Defaulting to STUDENT role. Campus will be auto-detected from email/ID if possible
      // In a real scenario, we might want to ask for more details
      const collegeId = email.split('@')[0].toUpperCase();
      user = await User.create({
        collegeId,
        email,
        name,
        googleId,
        isGoogleUser: true,
        role: 'STUDENT',
        password: Math.random().toString(36).slice(-10), // Random password
        profilePicture: picture,
      });
    } else {
      user.googleId = googleId;
      user.isGoogleUser = true;
      if (picture) user.profilePicture = picture;
      await user.save({ validateBeforeSave: false });
    }

    const token = auth.generateToken(user._id);
    const refreshToken = auth.generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        _id: user._id, collegeId: user.collegeId, name: user.name,
        email: user.email, role: user.role, branch: user.branch,
        campus: user.campus, points: user.points, level: user.level,
      },
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(400).json({ success: false, message: 'Google authentication failed.' });
  }
};

// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { collegeId, password, mfaToken } = req.body;

    if (!collegeId || !password) {
      return res.status(400).json({ success: false, message: 'Please provide College ID and password.' });
    }

    const user = await User.findOne({ collegeId: collegeId.toUpperCase() }).select('+password +mfaSecret');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated.' });
    }

    // MFA check for privileged roles
    const mfaRequiredRoles = ['HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN'];
    if (mfaRequiredRoles.includes(user.role) && user.mfaEnabled) {
      if (!mfaToken) {
        return res.status(200).json({ success: true, requiresMFA: true, message: 'MFA token required.' });
      }
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaToken,
        window: 1,
      });
      if (!verified) {
        return res.status(401).json({ success: false, message: 'Invalid MFA token.' });
      }
    }

    user.lastLogin = new Date();
    const refreshToken = auth.generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      user: user._id, action: 'LOGIN',
      details: { role: user.role, campus: user.campus },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    const token = auth.generateToken(user._id);
    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        _id: user._id, collegeId: user.collegeId, name: user.name,
        email: user.email, role: user.role, branch: user.branch,
        campus: user.campus, year: user.year, points: user.points,
        level: user.level, badges: user.badges, language: user.language,
        mfaEnabled: user.mfaEnabled, profilePicture: user.profilePicture,
      },
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// @route   POST /api/auth/refresh-token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token.' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const newToken = auth.generateToken(user._id);
    const newRefreshToken = auth.generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Refresh token expired or invalid.' });
  }
};

// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    await AuditLog.create({ user: req.user._id, action: 'LOGOUT', ipAddress: req.ip });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error logging out.' });
  }
};

// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('following', 'name collegeId role branch');
  res.json({ success: true, user });
};

// @route   POST /api/auth/setup-mfa
exports.setupMFA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `RGUKT:${req.user.email}`, issuer: 'RGUKT Platform' });
    await User.findByIdAndUpdate(req.user._id, { mfaSecret: secret.base32 });
    res.json({ success: true, secret: secret.base32, otpauth_url: secret.otpauth_url });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error setting up MFA.' });
  }
};

// @route   POST /api/auth/verify-mfa
exports.verifyMFA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id).select('+mfaSecret');
    const verified = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token, window: 1 });
    if (!verified) return res.status(400).json({ success: false, message: 'Invalid token.' });

    await User.findByIdAndUpdate(req.user._id, { mfaEnabled: true });
    res.json({ success: true, message: 'MFA enabled successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error verifying MFA.' });
  }
};
