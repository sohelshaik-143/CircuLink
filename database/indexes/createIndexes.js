// database/indexes/createIndexes.js
// Run once after DB setup: node createIndexes.js

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rgukt_platform';

const createIndexes = async () => {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log('✅ Connected. Creating indexes...\n');

  // ──────────────────────────────────────────────
  // USERS COLLECTION
  // ──────────────────────────────────────────────
  const users = db.collection('users');
  await users.createIndex({ collegeId: 1 }, { unique: true, name: 'idx_users_collegeId' });
  await users.createIndex({ email: 1 }, { unique: true, name: 'idx_users_email' });
  await users.createIndex({ role: 1, campus: 1, branch: 1 }, { name: 'idx_users_role_campus_branch' });
  await users.createIndex({ campus: 1, isActive: 1 }, { name: 'idx_users_campus_active' });
  await users.createIndex({ points: -1 }, { name: 'idx_users_points_desc' }); // leaderboard
  await users.createIndex({ branch: 1, role: 1, isActive: 1 }, { name: 'idx_users_branch_role' });
  await users.createIndex({ 'name': 'text', 'collegeId': 'text' }, { name: 'idx_users_text_search' });
  console.log('✅ Users: 7 indexes created');

  // ──────────────────────────────────────────────
  // POSTS COLLECTION
  // ──────────────────────────────────────────────
  const posts = db.collection('posts');
  await posts.createIndex(
    { title: 'text', content: 'text', tags: 'text' },
    { weights: { title: 10, tags: 5, content: 1 }, name: 'idx_posts_text_search' }
  );
  await posts.createIndex({ branch: 1, campus: 1, status: 1, createdAt: -1 }, { name: 'idx_posts_branch_campus' });
  await posts.createIndex({ author: 1, createdAt: -1 }, { name: 'idx_posts_author' });
  await posts.createIndex({ topics: 1, status: 1 }, { name: 'idx_posts_topics' });
  await posts.createIndex({ status: 1, isFeatured: -1, createdAt: -1 }, { name: 'idx_posts_status_featured' });
  await posts.createIndex({ likesCount: -1, status: 1 }, { name: 'idx_posts_trending' }); // trending
  await posts.createIndex({ visibility: 1, branch: 1, campus: 1 }, { name: 'idx_posts_visibility' });
  await posts.createIndex({ type: 1, status: 1 }, { name: 'idx_posts_type' });
  console.log('✅ Posts: 8 indexes created');

  // ──────────────────────────────────────────────
  // CIRCULARS COLLECTION
  // ──────────────────────────────────────────────
  const circulars = db.collection('circulars');
  await circulars.createIndex({ circularNumber: 1 }, { unique: true, name: 'idx_circulars_number' });
  await circulars.createIndex(
    { title: 'text', content: 'text' },
    { name: 'idx_circulars_text_search' }
  );
  await circulars.createIndex(
    { status: 1, targetBranches: 1, targetCampuses: 1, createdAt: -1 },
    { name: 'idx_circulars_status_targets' }
  );
  await circulars.createIndex({ category: 1, priority: 1, createdAt: -1 }, { name: 'idx_circulars_category_priority' });
  await circulars.createIndex({ author: 1, createdAt: -1 }, { name: 'idx_circulars_author' });
  await circulars.createIndex({ publishDate: -1, isActive: 1 }, { name: 'idx_circulars_published' });
  await circulars.createIndex({ expiryDate: 1 }, { name: 'idx_circulars_expiry' }); // for cleanup
  await circulars.createIndex({ 'approvalChain.status': 1, 'approvalChain.role': 1 }, { name: 'idx_circulars_approval' });
  console.log('✅ Circulars: 8 indexes created');

  // ──────────────────────────────────────────────
  // COMMENTS COLLECTION
  // ──────────────────────────────────────────────
  const comments = db.collection('comments');
  await comments.createIndex({ post: 1, createdAt: 1 }, { name: 'idx_comments_post' });
  await comments.createIndex({ circular: 1, createdAt: 1 }, { name: 'idx_comments_circular' });
  await comments.createIndex({ author: 1, createdAt: -1 }, { name: 'idx_comments_author' });
  await comments.createIndex({ parentComment: 1 }, { name: 'idx_comments_parent' });
  await comments.createIndex({ isDeleted: 1 }, { name: 'idx_comments_deleted', sparse: true });
  console.log('✅ Comments: 5 indexes created');

  // ──────────────────────────────────────────────
  // NOTIFICATIONS COLLECTION
  // ──────────────────────────────────────────────
  const notifications = db.collection('notifications');
  await notifications.createIndex(
    { recipient: 1, isRead: 1, createdAt: -1 },
    { name: 'idx_notifications_recipient' }
  );
  await notifications.createIndex({ recipient: 1, type: 1, createdAt: -1 }, { name: 'idx_notifications_type' });
  await notifications.createIndex({ isEmergency: 1, createdAt: -1 }, { name: 'idx_notifications_emergency', sparse: true });
  // TTL: auto-delete after 30 days
  await notifications.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60, name: 'idx_notifications_ttl' }
  );
  console.log('✅ Notifications: 4 indexes created (+ TTL 30d)');

  // ──────────────────────────────────────────────
  // AUDIT LOGS COLLECTION
  // ──────────────────────────────────────────────
  const auditLogs = db.collection('auditlogs');
  await auditLogs.createIndex({ user: 1, action: 1, createdAt: -1 }, { name: 'idx_audit_user_action' });
  await auditLogs.createIndex({ action: 1, createdAt: -1 }, { name: 'idx_audit_action' });
  await auditLogs.createIndex({ resourceType: 1, resourceId: 1 }, { name: 'idx_audit_resource' });
  await auditLogs.createIndex({ campus: 1, branch: 1, createdAt: -1 }, { name: 'idx_audit_campus' });
  // TTL: auto-delete after 90 days
  await auditLogs.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60, name: 'idx_audit_ttl' }
  );
  console.log('✅ Audit Logs: 5 indexes created (+ TTL 90d)');

  console.log('\n🎉 All indexes created successfully!');
  await mongoose.disconnect();
  process.exit(0);
};

createIndexes().catch(err => {
  console.error('❌ Index creation failed:', err);
  process.exit(1);
});
