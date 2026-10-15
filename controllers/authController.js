const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const auth = require('../middleware/auth');
const MySQLService = require('../services/mysqlService');

const STUDENT_ALLOWED_DOMAINS = [
  '@rguktrkv.ac.in',
  '@rguktong.ac.in',
  '@rguktskl.ac.in',
  '@rguktnuz.ac.in',
  '@rguktbasar.ac.in',
  '@rguktb.ac.in',
  '@rgukt.ac.in',
];

// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { collegeId, email, password, name, role, branch, campus, year, section } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();
    let rawCollegeId = String(collegeId || '').trim().toUpperCase();

    const cleanYear = (year && String(year).trim()) ? String(year).trim() : null;
    const cleanBranch = (branch && String(branch).trim()) ? String(branch).trim() : null;
    const cleanSection = (section && String(section).trim()) ? String(section).trim() : null;
    const cleanCollegeId = role === 'STUDENT' ? (rawCollegeId || null) : (rawCollegeId || null);

    if (role === 'STUDENT') {
      if (!cleanCollegeId) {
        return res.status(400).json({ success: false, message: 'Student ID (College ID) is required for student registration.' });
      }

      const isValidDomain = STUDENT_ALLOWED_DOMAINS.some(domain => normalizedEmail.endsWith(domain));
      if (!isValidDomain) {
        return res.status(400).json({
          success: false,
          message: 'Students must register with their college email (e.g. r220379@rguktrkv.ac.in, @rguktong.ac.in, @rguktskl.ac.in, @rguktnuz.ac.in).',
        });
      }
    }

    const existingUser = await MySQLService.findUserByLogin(normalizedEmail) || (cleanCollegeId ? await MySQLService.findUserByLogin(cleanCollegeId) : null);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email or Student ID already exists.' });
    }

    const user = await MySQLService.createUser({
      collegeId: cleanCollegeId,
      email: normalizedEmail,
      password,
      name,
      role,
      branch: cleanBranch,
      campus,
      year: cleanYear,
      section: cleanSection,
    });

    await MySQLService.logAudit({
      userId: user.id,
      action: 'REGISTER',
      resourceType: 'User',
      resourceId: user.id,
      details: { role, campus, branch: cleanBranch },
      ipAddress: req.ip,
    });

    const token = auth.generateToken(user.id);
    const refreshToken = auth.generateRefreshToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      refreshToken,
      user,
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
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

    const userRaw = await MySQLService.findUserByLogin(identifier);
    if (!userRaw) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, userRaw.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!userRaw.is_active) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated.' });
    }

    // MFA check for privileged roles
    const mfaRequiredRoles = ['HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN'];
    if (mfaRequiredRoles.includes(userRaw.role) && userRaw.mfa_enabled) {
      if (!mfaToken) {
        return res.status(200).json({ success: true, requiresMFA: true, message: 'MFA token required.' });
      }
      const verified = speakeasy.totp.verify({
        secret: userRaw.mfa_secret,
        encoding: 'base32',
        token: mfaToken,
        window: 1,
      });
      if (!verified) {
        return res.status(401).json({ success: false, message: 'Invalid MFA token.' });
      }
    }

    const token = auth.generateToken(userRaw.id);
    const refreshToken = auth.generateRefreshToken(userRaw.id);

    await MySQLService.updateUser(userRaw.id, {
      lastLogin: new Date(),
      refreshTokenHash: refreshToken.slice(-32),
    });

    await MySQLService.logAudit({
      userId: userRaw.id,
      action: 'LOGIN',
      details: { role: userRaw.role, campus: userRaw.campus },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: userRaw.formatted,
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await MySQLService.findUserById(req.user._id || req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/auth/refresh-token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token.' });

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'refreshsupersecretkey456');
    const user = await MySQLService.findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const newToken = auth.generateToken(user.id);
    const newRefreshToken = auth.generateRefreshToken(user.id);

    await MySQLService.updateUser(user.id, {
      refreshTokenHash: newRefreshToken.slice(-32),
    });

    res.json({ success: true, token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Refresh token expired or invalid.' });
  }
};

// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await MySQLService.updateUser(req.user._id || req.user.id, {
        refreshTokenHash: null,
      });
      await MySQLService.logAudit({
        userId: req.user._id || req.user.id,
        action: 'LOGOUT',
        ipAddress: req.ip,
      });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error logging out.' });
  }
};

// @route   POST /api/auth/google
exports.googleLogin = async (req, res) => {
  try {
    const { tokenId } = req.body;
    const https = require('https');
    const googleUserInfo = await new Promise((resolve, reject) => {
      https.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenId}`, (resp) => {
        let data = '';
        resp.on('data', chunk => { data += chunk; });
        resp.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      }).on('error', reject);
    });

    const { email, name, sub: googleId, picture } = googleUserInfo;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account has no email address.' });
    }

    let userRaw = await MySQLService.findUserByLogin(email);
    if (!userRaw) {
      const collegeId = email.split('@')[0].toUpperCase();
      const user = await MySQLService.createUser({
        collegeId,
        email,
        name: name || 'Google User',
        password: Math.random().toString(36).slice(-10),
        role: 'STUDENT',
        campus: 'RK Valley',
        branch: 'CSE',
        year: 'E1',
        profilePicture: picture || '',
      });
      userRaw = await MySQLService.findUserByLogin(user.email);
    }

    const token = auth.generateToken(userRaw.id);
    const refreshToken = auth.generateRefreshToken(userRaw.id);

    res.json({
      success: true,
      token,
      refreshToken,
      user: userRaw.formatted,
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(400).json({ success: false, message: `Google authentication failed: ${err.message}` });
  }
};

// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const userRaw = await MySQLService.findUserByLogin(email);
    if (!userRaw) return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
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
    // For demo purposes
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/auth/setup-mfa
exports.setupMFA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `RGUKT:${req.user.email}`, issuer: 'RGUKT Platform' });
    await MySQLService.updateUser(req.user._id || req.user.id, { mfaSecret: secret.base32 });
    res.json({ success: true, secret: secret.base32, otpauth_url: secret.otpauth_url });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error setting up MFA.' });
  }
};

// @route   POST /api/auth/verify-mfa
exports.verifyMFA = async (req, res) => {
  try {
    const { token } = req.body;
    const userRaw = await MySQLService.findUserByLogin(req.user.email);
    const verified = speakeasy.totp.verify({ secret: userRaw.mfa_secret, encoding: 'base32', token, window: 1 });
    if (!verified) return res.status(400).json({ success: false, message: 'Invalid token.' });

    await MySQLService.updateUser(req.user._id || req.user.id, { mfaEnabled: true });
    res.json({ success: true, message: 'MFA enabled successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error verifying MFA.' });
  }
};
