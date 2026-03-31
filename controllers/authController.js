const User = require('../models/User');
const { AuditLog } = require('../models/Other');
const auth = require('../middleware/auth');
const speakeasy = require('speakeasy');
const { OAuth2Client } = require('google-auth-library');

const STUDENT_ALLOWED_DOMAINS = [
  '@rguktrkv.ac.in',
  '@rguktong.ac.in',
  '@rguktskl.ac.in',
  '@rguktnuz.ac.in',
];

// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { collegeId, email, password, name, role, branch, campus, year, section } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();
    let normalizedCollegeId = String(collegeId || '').trim().toUpperCase();

    // For authorities, allow empty collegeId and derive a valid identifier from email.
    if (role !== 'STUDENT' && !normalizedCollegeId) {
      const emailPrefix = normalizedEmail.split('@')[0] || 'AUTHUSER';
      normalizedCollegeId = emailPrefix.replace(/[^a-z0-9_]/gi, '').toUpperCase().slice(0, 20);
      if (!normalizedCollegeId || normalizedCollegeId.length < 2) {
        normalizedCollegeId = `AU${Date.now().toString().slice(-6)}`;
      }
    }

    // Students must use their college email only
    if (role === 'STUDENT') {
      if (!normalizedCollegeId) {
        return res.status(400).json({ success: false, message: 'College ID is required for student registration.' });
      }

      const isValidDomain = STUDENT_ALLOWED_DOMAINS.some(domain => normalizedEmail.endsWith(domain));
      if (!isValidDomain) {
        return res.status(400).json({
          success: false,
          message: 'Students must register with their college email (e.g. r220379@rguktrkv.ac.in, @rguktong.ac.in, @rguktskl.ac.in, @rguktnuz.ac.in).',
        });
      }
    }

    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { collegeId: normalizedCollegeId }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this ID or email already exists.' });
    }

    const user = await User.create({ collegeId: normalizedCollegeId, email: normalizedEmail, password, name, role, branch, campus, year, section });

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
        campus: user.campus, year: user.year, points: user.points,
        level: user.level, profilePicture: user.profilePicture,
        joinedCommunity: user.joinedCommunity,
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
    const { tokenId } = req.body; // tokenId is an access_token from @react-oauth/google

    // Fetch user info using the access token
    const https = require('https');
    const googleUserInfo = await new Promise((resolve, reject) => {
      https.get(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        { headers: { Authorization: `Bearer ${tokenId}` } },
        (resp) => {
          let data = '';
          resp.on('data', chunk => { data += chunk; });
          resp.on('end', () => {
            if (resp.statusCode !== 200) return reject(new Error('Invalid Google token'));
            resolve(JSON.parse(data));
          });
        }
      ).on('error', reject);
    });
    const { email, name, sub: googleId, picture } = googleUserInfo;

    const isValidStudentDomain = STUDENT_ALLOWED_DOMAINS.some(domain => email.endsWith(domain));
    if (!isValidStudentDomain) {
      return res.status(400).json({
        success: false,
        message: 'Only college email accounts are allowed (@rguktrkv.ac.in, @rguktong.ac.in, @rguktskl.ac.in, @rguktnuz.ac.in).',
      });
    }

    // Detect campus from email domain
    const campusMap = {
      'rguktrkv.ac.in': 'RK Valley',
      'rguktong.ac.in': 'Ongole',
      'rguktskl.ac.in': 'Srikakulam',
      'rguktnuz.ac.in': 'Nuzvid',
    };
    const emailDomain = email.split('@')[1];
    const campus = campusMap[emailDomain] || 'RK Valley';

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      const collegeId = email.split('@')[0].toUpperCase();
      user = await User.create({
        collegeId,
        email,
        name,
        googleId,
        isGoogleUser: true,
        role: 'STUDENT',
        campus,
        branch: 'CSE',
        year: 'E1',
        password: Math.random().toString(36).slice(-10),
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
        campus: user.campus, year: user.year, points: user.points,
        level: user.level, profilePicture: user.profilePicture,
        joinedCommunity: user.joinedCommunity,
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
    const { loginId, collegeId, email, password, mfaToken } = req.body;
    const identifier = String(loginId || email || collegeId || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide College ID or email and password.' });
    }

    const lookup = identifier.includes('@')
      ? { email: identifier.toLowerCase() }
      : { collegeId: identifier.toUpperCase() };

    const user = await User.findOne(lookup).select('+password +mfaSecret');
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
        joinedCommunity: user.joinedCommunity,
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

// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = token;
    user.passwordResetExpires = expires;
    await user.save({ validateBeforeSave: false });

    // Return token directly (in production, send via email)
    res.json({
      success: true,
      message: 'Password reset token generated.',
      resetToken: token,
      note: 'Use this token to reset your password within 1 hour',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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
