// api/routes/userRoutes.js
// All user management, profile, follow, leaderboard endpoints

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { protect } = require('../../middleware/auth');
const { authorize, minRole } = require('../../middleware/rbac');
const User = require('../../models/User');
const { Notification, AuditLog } = require('../../models/Other');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
  next();
};

// ─── User List ──────────────────────────────────────────────────────────────

/**
 * @route   GET /api/users
 * @desc    Get paginated list of users (with filters)
 * @access  Private
 * @query   role, branch, campus, search, page, limit
 */
router.get('/', protect, async (req, res) => {
  try {
    const { role, branch, campus, search, page = 1, limit = 20, sortBy = 'name' } = req.query;
    const query = { isActive: true };

    if (role) query.role = role;
    if (branch) query.branch = branch;
    if (campus) query.campus = campus;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { collegeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Non-admins can't see ADMIN users
    if (!['ADMIN', 'DIRECTOR'].includes(req.user.role)) {
      query.role = { $ne: 'ADMIN' };
    }

    const sortMap = { name: 'name', points: '-points', recent: '-createdAt' };
    const sortOpt = sortMap[sortBy] || 'name';

    const [users, total] = await Promise.all([
      User.find(query)
        .select('name collegeId role branch campus year profilePicture points level badges isOnline lastSeen')
        .sort(sortOpt)
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({ success: true, count: users.length, total, pages: Math.ceil(total / limit), users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Leaderboard ────────────────────────────────────────────────────────────

/**
 * @route   GET /api/users/leaderboard
 * @desc    Campus/branch/global leaderboard sorted by points
 * @access  Private
 * @query   campus, branch, limit
 */
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const { campus, branch, limit = 10 } = req.query;
    const query = { role: 'STUDENT', isActive: true };
    if (campus && campus !== 'ALL') query.campus = campus;
    if (branch && branch !== 'ALL') query.branch = branch;

    const users = await User.find(query)
      .select('name collegeId branch campus points level badges profilePicture year')
      .sort('-points')
      .limit(Number(limit));

    res.json({ success: true, leaderboard: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── My Profile ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/users/profile
 * @desc    Get current user's own profile
 * @access  Private
 */
router.get('/profile', protect, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('following', 'name collegeId role branch campus profilePicture')
    .populate('followers', 'name collegeId role branch campus profilePicture')
    .select('-password -refreshToken -mfaSecret');
  res.json({ success: true, user });
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user's profile
 * @access  Private
 * @body    { name, bio, phone, language, theme, subscribedBranches, subscribedTopics, notificationPrefs }
 */
router.put('/profile', protect, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('bio').optional().isLength({ max: 300 }).withMessage('Bio max 300 chars'),
  body('language').optional().isIn(['en', 'te']).withMessage('Language must be en or te'),
  body('theme').optional().isIn(['light', 'dark']).withMessage('Theme must be light or dark'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], validate, async (req, res) => {
  try {
    const { name, bio, phone, language, theme, subscribedBranches, subscribedTopics, notificationPrefs, password } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (phone) user.phone = phone;
    if (language) user.language = language;
    if (theme) user.theme = theme;
    if (subscribedBranches) user.subscribedBranches = subscribedBranches;
    if (subscribedTopics) user.subscribedTopics = subscribedTopics;
    if (notificationPrefs) user.notificationPrefs = notificationPrefs;
    if (password) user.password = password;

    await user.save();

    const updatedUser = await User.findById(req.user._id)
      .select('-password -refreshToken -mfaSecret');

    await AuditLog.create({ user: req.user._id, action: 'CHANGE_SETTINGS', details: { updated: Object.keys(req.body) } });
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Follow / Unfollow ───────────────────────────────────────────────────────

/**
 * @route   POST /api/users/:id/follow
 * @desc    Follow or unfollow a user (toggle)
 * @access  Private
 */
router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
    }
    const target = await User.findById(req.params.id);
    if (!target || !target.isActive) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const currentUser = await User.findById(req.user._id);
    const isFollowing = currentUser.following.some(id => id.toString() === req.params.id);

    if (isFollowing) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { following: req.params.id },
        $inc: { followingCount: -1 },
      });
      await User.findByIdAndUpdate(req.params.id, {
        $pull: { followers: req.user._id },
        $inc: { followersCount: -1 },
      });
      return res.json({ success: true, following: false, message: 'Unfollowed successfully.' });
    } else {
      await User.findByIdAndUpdate(req.user._id, {
        $push: { following: req.params.id },
        $inc: { followingCount: 1 },
      });
      await User.findByIdAndUpdate(req.params.id, {
        $push: { followers: req.user._id },
        $inc: { followersCount: 1 },
      });
      await Notification.create({
        recipient: req.params.id,
        sender: req.user._id,
        type: 'NEW_FOLLOWER',
        title: 'New Follower',
        message: `${req.user.name} (${req.user.role}, ${req.user.branch}) started following you.`,
        priority: 'LOW',
      });
      await AuditLog.create({ user: req.user._id, action: 'FOLLOW_USER', resourceId: req.params.id, resourceType: 'User' });
      return res.json({ success: true, following: true, message: 'Followed successfully.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   GET /api/users/:id/followers
 * @desc    Get followers of a user
 */
router.get('/:id/followers', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'name collegeId role branch campus profilePicture points level');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, followers: user.followers, count: user.followers.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @route   GET /api/users/:id/following
 * @desc    Get who a user follows
 */
router.get('/:id/following', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('following', 'name collegeId role branch campus profilePicture points level');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, following: user.following, count: user.following.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Admin Operations ────────────────────────────────────────────────────────

/**
 * @route   PUT /api/users/:id/deactivate
 * @desc    Deactivate a user account (Admin only)
 * @access  Private — ADMIN, DIRECTOR
 */
router.put('/:id/deactivate', protect, authorize('ADMIN', 'DIRECTOR'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    await AuditLog.create({ user: req.user._id, action: 'BAN_USER', resourceId: req.params.id, resourceType: 'User', details: { reason: req.body.reason } });
    res.json({ success: true, message: `User ${user.name} deactivated.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @route   PUT /api/users/:id/activate
 * @desc    Reactivate a user account
 * @access  Private — ADMIN
 */
router.put('/:id/activate', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    res.json({ success: true, message: `User ${user.name} activated.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @route   PUT /api/users/:id/role
 * @desc    Change a user's role (Admin only)
 * @access  Private — ADMIN
 */
router.put('/:id/role', protect, authorize('ADMIN'), [
  body('role').isIn(['STUDENT', 'FACULTY', 'HOD', 'DSW', 'DEAN', 'DIRECTOR', 'SECURITY', 'ADMIN']),
], validate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
    await AuditLog.create({ user: req.user._id, action: 'CHANGE_SETTINGS', resourceId: req.params.id, details: { roleChange: req.body.role } });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Single User ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/users/:id
 * @desc    Get public profile of any user
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken -mfaSecret -emailVerifyToken -passwordResetToken')
      .populate('following', 'name collegeId role branch')
      .populate('followers', 'name collegeId role branch');

    if (!user || !user.isActive) return res.status(404).json({ success: false, message: 'User not found.' });

    // Check if current user follows this user
    const isFollowing = user.followers.some(f => f._id?.toString() === req.user._id.toString());

    res.json({ success: true, user, isFollowing });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Community Join/Leave ────────────────────────────────────────────────────
const msgCtrl = require('../../controllers/messageController');

router.post('/community/join',  protect, msgCtrl.joinCommunity);
router.post('/community/leave', protect, msgCtrl.leaveCommunity);

module.exports = router;
