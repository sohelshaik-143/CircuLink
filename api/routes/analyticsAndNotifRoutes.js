// api/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { authorize, minRole } = require('../../middleware/rbac');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Circular = require('../../models/Circular');
const { AuditLog } = require('../../models/Other');

/**
 * @route   GET /api/analytics/overview
 * @desc    Platform-wide stats (filtered by campus/branch)
 * @access  Private
 */
router.get('/overview', protect, async (req, res) => {
  try {
    const { campus, branch } = req.query;
    const uq = {}, pq = { status: 'PUBLISHED' };
    if (campus && campus !== 'ALL') { uq.campus = campus; pq.campus = campus; }
    if (branch && branch !== 'ALL') { uq.branch = branch; pq.branch = branch; }

    const [totalUsers, totalStudents, totalPosts, totalCirculars, pendingCirculars,
      onlineUsers, communityMembers, campusBreakdown, topPosts] = await Promise.all([
        User.countDocuments({ ...uq, isActive: true }),
        User.countDocuments({ ...uq, role: 'STUDENT', isActive: true }),
        Post.countDocuments(pq),
        Circular.countDocuments({ status: 'PUBLISHED', isActive: true }),
        Circular.countDocuments({ status: { $in: ['PENDING_HOD', 'PENDING_DEAN', 'PENDING_DIRECTOR'] } }),
        User.countDocuments({ ...uq, isOnline: true, isActive: true }),
        User.countDocuments({ ...uq, joinedCommunity: true, isActive: true }),
        User.aggregate([
          { $match: { isActive: true, role: 'STUDENT', ...(uq.campus ? { campus: uq.campus } : {}) } },
          { $group: { _id: '$campus', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Post.find(pq).sort({ likesCount: -1 }).limit(3).select('title likesCount branch').lean(),
      ]);

    // Determine most active campus
    const activeCampus = campusBreakdown[0]?._id || null;

    res.json({
      success: true,
      overview: {
        totalUsers, totalStudents, totalPosts, totalCirculars,
        pendingCirculars, onlineUsers, communityMembers,
        campusBreakdown, activeCampus, topPosts,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @route   GET /api/analytics/branch-activity
 * @desc    Per-branch activity stats
 * @access  Private
 */
router.get('/branch-activity', protect, async (req, res) => {
  try {
    const branches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT'];
    const campus = req.query.campus;
    const uq = campus ? { campus } : {};

    const activityData = await Promise.all(branches.map(async (branch) => {
      const [posts, students, faculty, endorsements] = await Promise.all([
        Post.countDocuments({ branch, status: 'PUBLISHED' }),
        User.countDocuments({ ...uq, branch, role: 'STUDENT', isActive: true }),
        User.countDocuments({ ...uq, branch, role: 'FACULTY', isActive: true }),
        Post.aggregate([
          { $match: { branch, status: 'PUBLISHED' } },
          { $group: { _id: null, total: { $sum: { $size: '$endorsements' } } } },
        ]),
      ]);
      return {
        branch, posts, students, faculty,
        endorsements: endorsements[0]?.total || 0,
      };
    }));

    res.json({ success: true, branchActivity: activityData });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @route   GET /api/analytics/campus-comparison
 * @desc    Compare activity across all 4 campuses
 * @access  Private — DEAN, DIRECTOR, ADMIN
 */
router.get('/campus-comparison', protect, minRole('DEAN'), async (req, res) => {
  try {
    const campuses = ['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam', 'ongole'];
    const data = await Promise.all(campuses.map(async (campus) => {
      const [students, posts, circulars] = await Promise.all([
        User.countDocuments({ campus, role: 'STUDENT', isActive: true }),
        Post.countDocuments({ campus, status: 'PUBLISHED' }),
        Circular.countDocuments({ targetCampuses: { $in: [campus, 'ALL'] }, status: 'PUBLISHED' }),
      ]);
      return { campus, students, posts, circulars };
    }));
    res.json({ success: true, campusData: data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @route   GET /api/analytics/topic-trends
 * @desc    Most popular topics across innovation posts
 * @access  Private
 */
router.get('/topic-trends', protect, async (req, res) => {
  try {
    const { campus, branch, days = 30 } = req.query;
    const match = { status: 'PUBLISHED', createdAt: { $gte: new Date(Date.now() - days * 86400000) } };
    if (campus && campus !== 'ALL') match.campus = campus;
    if (branch && branch !== 'ALL') match.branch = branch;

    const trends = await Post.aggregate([
      { $match: match },
      { $unwind: '$topics' },
      {
        $group: {
          _id: '$topics',
          count: { $sum: 1 },
          likes: { $sum: '$likesCount' },
          endorsements: { $sum: '$endorsementsCount' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]);

    res.json({ success: true, trends, period: `Last ${days} days` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @route   GET /api/analytics/engagement-over-time
 * @desc    Daily post/like counts for the past 30 days
 * @access  Private
 */
router.get('/engagement-over-time', protect, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 86400000);

    const daily = await Post.aggregate([
      { $match: { createdAt: { $gte: since }, status: 'PUBLISHED' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          posts: { $sum: 1 },
          totalLikes: { $sum: '$likesCount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, daily });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @route   GET /api/analytics/circular-stats
 * @desc    Circular approval times, counts by category, read rates
 * @access  Private — HOD+
 */
router.get('/circular-stats', protect, minRole('HOD'), async (req, res) => {
  try {
    const [byCategory, byStatus, recentPublished] = await Promise.all([
      Circular.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Circular.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Circular.find({ status: 'PUBLISHED' })
        .sort('-publishDate').limit(5)
        .select('title category readCount publishDate priority'),
    ]);

    res.json({ success: true, byCategory, byStatus, recentPublished });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @route   GET /api/analytics/leaderboard
 * @desc    Top students by points (with branch/campus filter)
 * @access  Private
 */
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const { campus, branch, limit = 20 } = req.query;
    const query = { role: 'STUDENT', isActive: true };
    if (campus && campus !== 'ALL') query.campus = campus;
    if (branch && branch !== 'ALL') query.branch = branch;

    const users = await User.find(query)
      .select('name collegeId branch campus year points level badges profilePicture')
      .sort('-points').limit(Number(limit));

    res.json({ success: true, leaderboard: users });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @route   GET /api/analytics/audit-logs
 * @desc    Full audit log (DEAN, DIRECTOR, ADMIN only)
 * @access  Private — DEAN, DIRECTOR, ADMIN
 */
router.get('/audit-logs', protect, minRole('DEAN'), async (req, res) => {
  try {
    const { page = 1, limit = 20, action, userId, campus, branch, from, to } = req.query;
    const query = {};
    if (action) query.action = action;
    if (userId) query.user = userId;
    if (campus) query.campus = campus;
    if (branch) query.branch = branch;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name collegeId role campus branch')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      AuditLog.countDocuments(query),
    ]);

    res.json({ success: true, total, pages: Math.ceil(total / limit), logs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics as CSV (DIRECTOR, ADMIN)
 * @access  Private — DIRECTOR, ADMIN
 */
router.get('/export', protect, authorize('DIRECTOR', 'ADMIN'), async (req, res) => {
  try {
    const { type = 'users' } = req.query;
    let data;
    let filename;

    if (type === 'users') {
      data = await User.find({ isActive: true }).select('name collegeId role branch campus points level createdAt').lean();
      filename = 'users_export.json';
    } else if (type === 'posts') {
      data = await Post.find({ status: 'PUBLISHED' }).select('title type branch campus likesCount commentsCount views createdAt').lean();
      filename = 'posts_export.json';
    } else if (type === 'circulars') {
      data = await Circular.find({}).select('title category status priority readCount publishDate').lean();
      filename = 'circulars_export.json';
    }

    await AuditLog.create({ user: req.user._id, action: 'EXPORT_DATA', details: { type } });

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, exportType: type, count: data.length, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;


// ═══════════════════════════════════════════════════════════════════
// api/routes/notificationRoutes.js
// ═══════════════════════════════════════════════════════════════════
const notifRouter = express.Router();
const { Notification } = require('../../models/Other');

/**
 * @route   GET /api/notifications
 * @query   unreadOnly, page, limit, type
 */
notifRouter.get('/', protect, async (req, res) => {
  try {
    const { unreadOnly, page = 1, limit = 20, type } = req.query;
    const query = { recipient: req.user._id };
    if (unreadOnly === 'true') query.isRead = false;
    if (type) query.type = type;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'name role profilePicture')
        .sort({ isEmergency: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    res.json({ success: true, notifications, unreadCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/** @route PUT /api/notifications/:id/read */
notifRouter.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/** @route PUT /api/notifications/mark-all-read */
notifRouter.put('/mark-all-read', protect, async (req, res) => {
  try {
    const { count } = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, markedCount: count });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/** @route DELETE /api/notifications/:id */
notifRouter.delete('/:id', protect, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/** @route DELETE /api/notifications/clear-all */
notifRouter.delete('/clear-all', protect, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id, isRead: true });
    res.json({ success: true, message: 'All read notifications cleared.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = { analyticsRouter: router, notifRouter };
