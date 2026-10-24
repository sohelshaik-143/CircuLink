const jwt = require('jsonwebtoken');
const MySQLService = require('../services/mysqlService');

function getJwtSecret() {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16)) {
    console.error('CRITICAL SECURITY ALERT: JWT_SECRET is unset or too short for production environment.');
  }
  return process.env.JWT_SECRET || 'circulink_rgukt_secure_jwt_secret_2026_dev';
}

function getRefreshTokenSecret() {
  if (process.env.NODE_ENV === 'production' && (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET.length < 16)) {
    console.error('CRITICAL SECURITY ALERT: REFRESH_TOKEN_SECRET is unset or too short for production environment.');
  }
  return process.env.REFRESH_TOKEN_SECRET || 'circulink_rgukt_secure_refresh_token_2026_dev';
}

// Protect routes — verify JWT using MySQL 8
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await MySQLService.findUserById(decoded.id);

    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account deactivated.' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// Optional auth (for public routes that behave differently if logged in)
exports.optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = await MySQLService.findUserById(decoded.id);
    } catch (_) {}
  }
  next();
};

// Generate Access Token
exports.generateToken = (userId) => {
  return jwt.sign({ id: userId }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Generate Refresh Token
exports.generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, getRefreshTokenSecret(), {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '30d',
  });
};
