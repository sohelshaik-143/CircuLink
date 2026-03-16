const { Message } = require('../models/Other');
const User = require('../models/User');
const path = require('path');

// GET /api/messages/:userId — conversation between current user and :userId
exports.getConversation = async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me },
      ],
    }).sort({ createdAt: 1 });

    // Mark received messages as read
    await Message.updateMany(
      { sender: other, receiver: me, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/messages/:userId — send encrypted message (text or file)
exports.sendMessage = async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;

    // Only community members can message
    const [senderUser, receiverUser] = await Promise.all([
      User.findById(me),
      User.findById(other),
    ]);
    if (!senderUser?.joinedCommunity || !receiverUser?.joinedCommunity) {
      return res.status(403).json({ success: false, message: 'Both users must be community members to message.' });
    }

    const msgData = { sender: me, receiver: other };

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      msgData.fileUrl = `/uploads/messages/${req.file.filename}`;
      msgData.fileType = imageExts.includes(ext) ? 'image' : 'file';
      msgData.fileName = req.file.originalname;
    } else {
      if (!req.body.content) {
        return res.status(400).json({ success: false, message: 'Message content or file required.' });
      }
      msgData.content = req.body.content; // already AES-encrypted by client
    }

    const message = await Message.create(msgData);

    // Real-time delivery via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${other}`).emit('new_message', {
        message: { ...message.toObject(), senderName: senderUser.name },
      });
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/messages/unread — count of unread messages per sender
exports.getUnreadCounts = async (req, res) => {
  try {
    const counts = await Message.aggregate([
      { $match: { receiver: req.user._id, isRead: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } },
    ]);
    res.json({ success: true, counts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users/community/join
exports.joinCommunity = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      joinedCommunity: true,
      communityJoinedAt: new Date(),
    });
    res.json({ success: true, message: 'You have joined the community!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users/community/leave
exports.leaveCommunity = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { joinedCommunity: false });
    res.json({ success: true, message: 'You have left the community.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
