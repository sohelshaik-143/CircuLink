const MySQLService = require('../services/mysqlService');
const path = require('path');

// GET /api/messages/:userId
exports.getConversation = async (req, res) => {
  try {
    const me = req.user._id || req.user.id;
    const other = req.params.userId;
    const messages = await MySQLService.getConversation(me, other);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/messages/:userId
exports.sendMessage = async (req, res) => {
  try {
    const me = req.user._id || req.user.id;
    const other = req.params.userId;

    let fileUrl = null;
    let fileName = null;
    let fileType = null;
    let content = req.body.content || '';

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      fileUrl = `/uploads/messages/${req.file.filename}`;
      fileType = imageExts.includes(ext) ? 'image' : 'file';
      fileName = req.file.originalname;
    } else if (!content) {
      return res.status(400).json({ success: false, message: 'Message content or file required.' });
    }

    const message = await MySQLService.sendMessage(me, other, content, fileUrl, fileName, fileType);

    // Socket.IO real-time emission
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${other}`).emit('new_message', {
        message: { ...message, senderName: req.user.name },
      });
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/messages/unread
exports.getUnreadCounts = async (req, res) => {
  try {
    const counts = await MySQLService.getUnreadMessageCounts(req.user._id || req.user.id);
    res.json({ success: true, counts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users/community/join
exports.joinCommunity = async (req, res) => {
  try {
    await MySQLService.updateUser(req.user._id || req.user.id, { joinedCommunity: true });
    res.json({ success: true, message: 'You have joined the community!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users/community/leave
exports.leaveCommunity = async (req, res) => {
  try {
    await MySQLService.updateUser(req.user._id || req.user.id, { joinedCommunity: false });
    res.json({ success: true, message: 'You have left the community.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
