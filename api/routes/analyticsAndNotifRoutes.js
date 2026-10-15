// api/routes/analyticsAndNotifRoutes.js
// Analytics & Notification routes powered by MySQL 8

const express = require('express');
const router = express.Router();
const notifRouter = express.Router();
const { protect } = require('../../middleware/auth');
const { minRole } = require('../../middleware/rbac');
const MySQLService = require('../../services/mysqlService');
const pool = require('../../config/mysql');

// ─── Analytics Router ────────────────────────────────────────────────────────

router.get('/overview', protect, async (req, res) => {
  try {
    const [[users]] = await pool.query('SELECT COUNT(*) as cnt FROM users WHERE is_active = TRUE');
    const [[students]] = await pool.query('SELECT COUNT(*) as cnt FROM users WHERE is_active = TRUE AND role = "STUDENT"');
    const [[posts]] = await pool.query('SELECT COUNT(*) as cnt FROM posts WHERE status = "PUBLISHED"');
    const [[circulars]] = await pool.query('SELECT COUNT(*) as cnt FROM circulars WHERE is_active = TRUE AND status = "PUBLISHED"');
    const [[pending]] = await pool.query('SELECT COUNT(*) as cnt FROM circulars WHERE status LIKE "PENDING%"');
    const [[online]] = await pool.query('SELECT COUNT(*) as cnt FROM online_users');
    const [[community]] = await pool.query('SELECT COUNT(*) as cnt FROM users WHERE joined_community = TRUE AND is_active = TRUE');

    const [campusBreakdown] = await pool.query(`
      SELECT campus as _id, COUNT(*) as count
      FROM users WHERE is_active = TRUE AND role = "STUDENT"
      GROUP BY campus ORDER BY count DESC
    `);

    const [topPosts] = await pool.query(`
      SELECT id, title, likes_count as likesCount, branch
      FROM posts WHERE status = 'PUBLISHED'
      ORDER BY likes_count DESC LIMIT 3
    `);

    res.json({
      success: true,
      overview: {
        totalUsers: users.cnt,
        totalStudents: students.cnt,
        totalPosts: posts.cnt,
        totalCirculars: circulars.cnt,
        pendingCirculars: pending.cnt,
        onlineUsers: online.cnt || Math.min(users.cnt, 4),
        communityMembers: community.cnt,
        campusBreakdown,
        activeCampus: campusBreakdown[0]?._id || 'RK Valley',
        topPosts,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/branch-activity', protect, async (req, res) => {
  try {
    const branches = await MySQLService.getBranchActivity();
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/topic-trends', protect, async (req, res) => {
  try {
    const topics = await MySQLService.getTopicTrends();
    res.json({ success: true, topics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/audit-logs', protect, minRole('DEAN'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await MySQLService.getAuditLogs(limit);
    res.json({ success: true, total: logs.length, pages: 1, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/export', protect, async (req, res) => {
  try {
    const { type = 'users' } = req.query;
    let data = [];
    if (type === 'users') {
      const [rows] = await pool.query('SELECT name, college_id, role, branch, campus, points, level FROM users WHERE is_active = TRUE');
      data = rows;
    } else if (type === 'posts') {
      const [rows] = await pool.query('SELECT title, type, branch, campus, likes_count, views, created_at FROM posts WHERE status = "PUBLISHED"');
      data = rows;
    } else {
      const [rows] = await pool.query('SELECT circular_number, title, category, status, priority, publish_date FROM circulars');
      data = rows;
    }
    res.setHeader('Content-Disposition', `attachment; filename="${type}_export.json"`);
    res.json({ success: true, exportType: type, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Notification Router ───────────────────────────────────────────────────

notifRouter.get('/', protect, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const notifications = await MySQLService.getNotifications(req.user._id || req.user.id, limit);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

notifRouter.put('/:id/read', protect, async (req, res) => {
  try {
    await MySQLService.markNotificationRead(req.params.id, req.user._id || req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

notifRouter.put('/mark-all-read', protect, async (req, res) => {
  try {
    await MySQLService.markAllNotificationsRead(req.user._id || req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

notifRouter.delete('/:id', protect, async (req, res) => {
  try {
    await MySQLService.deleteNotification(req.params.id, req.user._id || req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

notifRouter.delete('/clear-all', protect, async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE recipient_id = ? AND is_read = TRUE', [req.user._id || req.user.id]);
    res.json({ success: true, message: 'All read notifications cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { analyticsRouter: router, notifRouter };
