// api/routes/userRoutes.js
// Complete User Management API powered by MySQL 8

const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const MySQLService = require('../../services/mysqlService');
const upload = require('../../middleware/upload');

// GET /api/users/leaderboard (must be before /:id)
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const leaderboard = await MySQLService.getLeaderboard(limit);
    res.json({ success: true, count: leaderboard.length, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/community/join
router.post('/community/join', protect, async (req, res) => {
  try {
    const user = await MySQLService.updateUser(req.user._id || req.user.id, { joinedCommunity: true });
    res.json({ success: true, message: 'Joined community successfully!', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/community/leave
router.post('/community/leave', protect, async (req, res) => {
  try {
    const user = await MySQLService.updateUser(req.user._id || req.user.id, { joinedCommunity: false });
    res.json({ success: true, message: 'Left community.', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/profile
router.put('/profile', protect, upload.single('profilePicture'), async (req, res) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name.trim();
    if (req.body.bio !== undefined) updates.bio = req.body.bio.trim();
    if (req.body.phone !== undefined) updates.phone = req.body.phone.trim();
    if (req.body.theme) updates.theme = req.body.theme;
    if (req.body.language) updates.language = req.body.language;
    if (req.file) updates.profilePicture = `/uploads/${req.file.filename}`;

    const user = await MySQLService.updateUser(req.user._id || req.user.id, updates);
    res.json({ success: true, message: 'Profile updated.', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users
router.get('/', protect, async (req, res) => {
  try {
    const { role, branch, campus, search, page = 1, limit = 20, joinedCommunity } = req.query;
    const result = await MySQLService.getUsers({
      role,
      branch,
      campus,
      search,
      page,
      limit,
      joinedCommunity,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await MySQLService.findUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/:id/follow
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const result = await MySQLService.toggleFollow(req.user._id || req.user.id, req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
