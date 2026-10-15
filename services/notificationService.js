// services/notificationService.js
// Centralized notification + socket emit service powered by MySQL 8

const pool = require('../config/mysql');

class NotificationService {
  constructor(io) {
    this.io = io; // Socket.IO instance
  }

  // Send to a single user
  async sendToUser(recipientId, notification) {
    const { sender, type, title, message, link, priority = 'MEDIUM', isEmergency = false, relatedCircular, relatedPost } = notification;

    const [res] = await pool.query(`
      INSERT INTO notifications (recipient_id, sender_id, type, title, message, link, priority, is_emergency, related_circular_id, related_post_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      recipientId,
      sender || null,
      type || 'SYSTEM',
      title,
      message,
      link || null,
      priority,
      isEmergency,
      relatedCircular || null,
      relatedPost || null,
    ]);

    const notifObj = {
      _id: res.insertId,
      id: res.insertId,
      recipient: recipientId,
      ...notification,
      isRead: false,
      createdAt: new Date(),
    };

    this.io?.to(`user:${recipientId}`).emit('notification', notifObj);
    return notifObj;
  }

  // Send to multiple users
  async sendToMany(recipientIds, notification) {
    if (!recipientIds.length) return;
    for (const id of recipientIds) {
      await this.sendToUser(id, notification);
    }
  }

  // Broadcast emergency to ALL active users
  async broadcastEmergency(sender, data) {
    const [users] = await pool.query('SELECT id FROM users WHERE is_active = TRUE');
    const ids = users.map(u => u.id);

    await this.sendToMany(ids, {
      sender: sender._id || sender.id,
      type: 'EMERGENCY',
      title: `🚨 EMERGENCY: ${data.title}`,
      message: data.content,
      priority: 'URGENT',
      isEmergency: true,
      relatedCircular: data.circularId,
    });

    this.io?.emit('emergency', {
      title: data.title,
      content: data.content,
      broadcastBy: sender.name,
      broadcastAt: new Date(),
    });
  }

  // Notify approvers when circular needs review
  async notifyApprovers(role, circularId, circularTitle, senderUser) {
    const [approvers] = await pool.query('SELECT id FROM users WHERE role = ? AND is_active = TRUE', [role]);
    if (!approvers.length) return;

    await this.sendToMany(
      approvers.map(u => u.id),
      {
        sender: senderUser._id || senderUser.id,
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
    const [followers] = await pool.query('SELECT follower_id FROM user_followers WHERE following_id = ?', [author._id || author.id]);
    if (!followers.length) return;

    const followerIds = followers.map(f => f.follower_id);
    await this.sendToMany(followerIds.slice(0, 100), {
      sender: author._id || author.id,
      type: 'NEW_POST',
      title: `New post by ${author.name}`,
      message: `"${postTitle}"`,
      relatedPost: postId,
      priority: 'LOW',
    });
  }

  // Award badge notification
  async awardBadge(userId, badgeName) {
    await pool.query('INSERT IGNORE INTO user_badges (user_id, badge_name) VALUES (?, ?)', [userId, badgeName]);
    await this.sendToUser(userId, {
      type: 'BADGE_EARNED',
      title: `🏅 New Badge: ${badgeName}!`,
      message: `Congratulations! You earned the "${badgeName}" badge.`,
      priority: 'MEDIUM',
    });
  }
}

module.exports = NotificationService;
