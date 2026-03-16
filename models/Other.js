const mongoose = require('mongoose');

// ─── Comment ───────────────────────────────────────────────────────────────
const CommentSchema = new mongoose.Schema({
  content: { type: String, required: true, maxlength: 1000 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  circular: { type: mongoose.Schema.Types.ObjectId, ref: 'Circular' },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
}, { timestamps: true });

// ─── Notification ──────────────────────────────────────────────────────────
const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: [
      'NEW_CIRCULAR', 'CIRCULAR_APPROVED', 'CIRCULAR_REJECTED',
      'NEW_POST', 'POST_LIKED', 'POST_COMMENTED', 'POST_ENDORSED',
      'NEW_FOLLOWER', 'APPROVAL_REQUIRED', 'EMERGENCY',
      'BADGE_EARNED', 'MENTION', 'SYSTEM',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String },
  relatedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  relatedCircular: { type: mongoose.Schema.Types.ObjectId, ref: 'Circular' },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
  isEmergency: { type: Boolean, default: false },
}, { timestamps: true });

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// ─── Audit Log ─────────────────────────────────────────────────────────────
const AuditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: [
      'LOGIN', 'LOGOUT', 'REGISTER',
      'CREATE_POST', 'EDIT_POST', 'DELETE_POST',
      'CREATE_CIRCULAR', 'EDIT_CIRCULAR', 'DELETE_CIRCULAR',
      'APPROVE_CIRCULAR', 'REJECT_CIRCULAR',
      'LIKE_POST', 'COMMENT', 'ENDORSE',
      'FOLLOW_USER', 'UNFOLLOW_USER',
      'BROADCAST_EMERGENCY', 'CHANGE_SETTINGS',
      'VIEW_ANALYTICS', 'EXPORT_DATA',
    ],
    required: true,
  },
  resourceType: { type: String, enum: ['User', 'Post', 'Circular', 'Comment', 'System'] },
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  campus: { type: String },
  branch: { type: String },
}, { timestamps: true });

AuditLogSchema.index({ user: 1, action: 1, createdAt: -1 });

// ─── Message ────────────────────────────────────────────────────────────────
const MessageSchema = new mongoose.Schema({
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:  { type: String }, // AES-encrypted text, stored as-is
  fileUrl:  { type: String }, // relative path served from /uploads/messages/
  fileType: { type: String, enum: ['image', 'file'] },
  fileName: { type: String },
  isRead:   { type: Boolean, default: false },
  readAt:   { type: Date },
}, { timestamps: true });

MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, isRead: 1 });

module.exports = {
  Comment: mongoose.models.Comment || mongoose.model('Comment', CommentSchema),
  Notification: mongoose.models.Notification || mongoose.model('Notification', NotificationSchema),
  AuditLog: mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema),
  Message: mongoose.models.Message || mongoose.model('Message', MessageSchema),
};
