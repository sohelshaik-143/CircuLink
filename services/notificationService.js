// services/notificationService.js
// Centralized notification + socket emit service

const { Notification } = require('../models/Other');
const User = require('../models/User');

class NotificationService {
  constructor(io) {
    this.io = io; // Socket.IO instance
  }

  // Send to a single user
  async sendToUser(recipientId, notification) {
    const notif = await Notification.create({ recipient: recipientId, ...notification });
    this.io?.to(`user:${recipientId}`).emit('notification', notif);
    return notif;
  }

  // Send to multiple users
  async sendToMany(recipientIds, notification) {
    if (!recipientIds.length) return;
    const docs = recipientIds.map(id => ({ recipient: id, ...notification }));

    // Batch in chunks of 500
    for (let i = 0; i < docs.length; i += 500) {
      await Notification.insertMany(docs.slice(i, i + 500));
    }

    // Emit to each socket
    recipientIds.forEach(id => {
      this.io?.to(`user:${id}`).emit('notification', { ...notification });
    });
  }

  // Broadcast emergency to ALL users
  async broadcastEmergency(sender, data) {
    const allUsers = await User.find({ isActive: true }).select('_id').lean();
    const ids = allUsers.map(u => u._id);

    await this.sendToMany(ids, {
      sender: sender._id,
      type: 'EMERGENCY',
      title: `🚨 EMERGENCY: ${data.title}`,
      message: data.content,
      priority: 'URGENT',
      isEmergency: true,
      relatedCircular: data.circularId,
    });

    // Socket room broadcast
    this.io?.emit('emergency', {
      title: data.title,
      content: data.content,
      broadcastBy: sender.name,
      broadcastAt: new Date(),
    });
  }

  // Notify approvers when circular needs review
  async notifyApprovers(role, circularId, circularTitle, senderUser) {
    const approvers = await User.find({ role, isActive: true }).select('_id').lean();
    if (!approvers.length) return;

    await this.sendToMany(
      approvers.map(u => u._id),
      {
        sender: senderUser._id,
        type: 'APPROVAL_REQUIRED',
        title: '📋 Circular Awaiting Your Approval',
        message: `"${circularTitle}" needs your review as ${role}.`,
        relatedCircular: circularId,
        priority: 'HIGH',
      }
    );
  }

  // Notify followers about new post
  async notifyFollowers(author, postId, postTitle) {
    const authorDoc = await User.findById(author._id).populate('followers', '_id').lean();
    if (!authorDoc?.followers?.length) return;

    const followerIds = authorDoc.followers.map(f => f._id);
    await this.sendToMany(followerIds.slice(0, 100), {
      sender: author._id,
      type: 'NEW_POST',
      title: `New post by ${author.name}`,
      message: `"${postTitle}"`,
      relatedPost: postId,
      priority: 'LOW',
    });
  }

  // Award badge notification
  async awardBadge(userId, badgeName) {
    await User.findByIdAndUpdate(userId, { $addToSet: { badges: badgeName } });
    await this.sendToUser(userId, {
      type: 'BADGE_EARNED',
      title: `🏅 New Badge: ${badgeName}!`,
      message: `Congratulations! You earned the "${badgeName}" badge.`,
      priority: 'MEDIUM',
    });
  }
}

module.exports = NotificationService;
