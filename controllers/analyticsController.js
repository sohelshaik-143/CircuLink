const User = require('../models/User');
const Post = require('../models/Post');
const Circular = require('../models/Circular');
const { Notification, AuditLog } = require('../models/Other');

// ─── USER CONTROLLER ───────────────────────────────────────────────────────

// @route   GET /api/users
exports.getUsers = async (req, res) => {
  try {
    const { role, branch, campus, search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (role) query.role = role;
    if (branch) query.branch = branch;
    if (campus) query.campus = campus;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { collegeId: { $regex: search, $options: 'i' } },
    ];

    const users = await User.find(query)
      .select('name collegeId role branch campus profilePicture points level badges')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   GET /api/users/:id
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken -mfaSecret')
      .populate('following', 'name collegeId role branch')
      .populate('followers', 'name collegeId role branch');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, phone, language, campus, subscribedBranches, subscribedTopics } = req.body;
    let profilePicture;

    // Check if an image was uploaded via Multer
    if (req.file) {
      profilePicture = `/uploads/${req.file.filename}`;
    }

    const updateData = { name, bio, phone, language, campus, subscribedBranches, subscribedTopics };
    if (profilePicture) updateData.profilePicture = profilePicture;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/users/:id/follow
exports.followUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself.' });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    const isFollowing = req.user.following.includes(req.params.id);
    if (isFollowing) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id } });
      await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user._id } });
      return res.json({ success: true, following: false });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $push: { following: req.params.id } });
      await User.findByIdAndUpdate(req.params.id, { $push: { followers: req.user._id } });
      await Notification.create({
        recipient: req.params.id, sender: req.user._id,
        type: 'NEW_FOLLOWER', title: 'New Follower',
        message: `${req.user.name} started following you.`,
      });
      return res.json({ success: true, following: true });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   GET /api/users/leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const { campus, branch, limit = 10 } = req.query;
    const query = { role: 'STUDENT', isActive: true };
    if (campus) query.campus = campus;
    if (branch) query.branch = branch;

    const users = await User.find(query)
      .select('name collegeId branch campus points level badges profilePicture')
      .sort('-points')
      .limit(Number(limit));

    res.json({ success: true, leaderboard: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── ANALYTICS CONTROLLER ──────────────────────────────────────────────────

// @route   GET /api/analytics/overview
exports.getOverview = async (req, res) => {
  try {
    const { campus, branch } = req.query;
    const userQuery = {};
    const postQuery = {};
    if (campus && campus !== 'ALL') { userQuery.campus = campus; postQuery.campus = campus; }
    if (branch && branch !== 'ALL') { userQuery.branch = branch; postQuery.branch = branch; }

    const [totalUsers, totalPosts, totalCirculars, pendingCirculars] = await Promise.all([
      User.countDocuments(userQuery),
      Post.countDocuments({ ...postQuery, status: 'PUBLISHED' }),
      Circular.countDocuments({ status: 'PUBLISHED' }),
      Circular.countDocuments({ status: { $in: ['PENDING_HOD', 'PENDING_DEAN', 'PENDING_DIRECTOR'] } }),
    ]);

    res.json({ success: true, overview: { totalUsers, totalPosts, totalCirculars, pendingCirculars } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   GET /api/analytics/branch-activity
exports.getBranchActivity = async (req, res) => {
  try {
    const branches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT'];
    const activityData = await Promise.all(branches.map(async (branch) => {
      const [posts, students, circulars] = await Promise.all([
        Post.countDocuments({ branch, status: 'PUBLISHED' }),
        User.countDocuments({ branch, role: 'STUDENT' }),
        Circular.countDocuments({ targetBranches: { $in: [branch, 'ALL'] }, status: 'PUBLISHED' }),
      ]);
      return { branch, posts, students, circulars };
    }));

    res.json({ success: true, branchActivity: activityData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   GET /api/analytics/topic-trends
exports.getTopicTrends = async (req, res) => {
  try {
    const trends = await Post.aggregate([
      { $match: { status: 'PUBLISHED' } },
      { $unwind: '$topics' },
      { $group: { _id: '$topics', count: { $sum: 1 }, likes: { $sum: { $size: '$likes' } } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    res.json({ success: true, trends });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   GET /api/analytics/audit-logs
exports.getAuditLogs = async (req, res) => {
  try {
    if (!['DEAN', 'DIRECTOR', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    const { page = 1, limit = 20, action, userId } = req.query;
    const query = {};
    if (action) query.action = action;
    if (userId) query.user = userId;

    const logs = await AuditLog.find(query)
      .populate('user', 'name collegeId role campus')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(query);
    res.json({ success: true, total, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
