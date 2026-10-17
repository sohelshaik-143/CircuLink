// services/mysqlService.js
// Ultra-fast MySQL 8 Data Access Layer for RGUKT CircuLink Platform

const pool = require('../config/mysql');
const bcrypt = require('bcryptjs');

// ─── Format Helpers ─────────────────────────────────────────────────────────

function formatUser(row, badges = []) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    collegeId: row.college_id,
    name: row.name,
    email: row.email,
    role: row.role,
    campus: row.campus,
    branch: row.branch,
    year: row.year,
    section: row.section,
    points: row.points || 0,
    level: row.level || 'Beginner',
    streakDays: row.streak_days || 0,
    profilePicture: row.profile_picture || '',
    bio: row.bio || '',
    phone: row.phone || '',
    mfaEnabled: Boolean(row.mfa_enabled),
    mfaSecret: row.mfa_secret || null,
    isActive: Boolean(row.is_active),
    isOnline: Boolean(row.is_online),
    joinedCommunity: Boolean(row.joined_community),
    theme: row.theme || 'light',
    language: row.language || 'en',
    badges: badges || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class MySQLService {
  // ─── User & Auth Operations ───────────────────────────────────────────────

  static async findUserByLogin(loginId) {
    if (!loginId) return null;
    const clean = String(loginId).trim();
    const isEmail = clean.includes('@');
    const sql = isEmail
      ? 'SELECT * FROM users WHERE email = ? LIMIT 1'
      : 'SELECT * FROM users WHERE college_id = ? OR email = ? LIMIT 1';
    const params = isEmail ? [clean.toLowerCase()] : [clean.toUpperCase(), clean.toLowerCase()];

    const [rows] = await pool.query(sql, params);
    if (!rows.length) return null;

    const user = rows[0];
    const [badgeRows] = await pool.query('SELECT badge_name FROM user_badges WHERE user_id = ?', [user.id]);
    const badges = badgeRows.map(b => b.badge_name);
    return { ...user, formatted: formatUser(user, badges) };
  }

  static async findUserById(id) {
    if (!id) return null;
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return null;

    const user = rows[0];
    const [badgeRows] = await pool.query('SELECT badge_name FROM user_badges WHERE user_id = ?', [user.id]);
    const badges = badgeRows.map(b => b.badge_name);
    return formatUser(user, badges);
  }

  static async createUser(userData) {
    const {
      collegeId, email, password, name, role, campus, branch, year, section, profilePicture
    } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO users (college_id, email, password, name, role, campus, branch, year, section, profile_picture, is_active, joined_community)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, FALSE)
    `;
    const [result] = await pool.query(sql, [
      collegeId || null,
      email.toLowerCase(),
      hashedPassword,
      name,
      role,
      campus,
      branch || null,
      year || null,
      section || null,
      profilePicture || '',
    ]);

    return this.findUserById(result.insertId);
  }

  static async updateUser(id, fields) {
    const allowed = [
      'name', 'bio', 'phone', 'profile_picture', 'theme', 'language',
      'joined_community', 'points', 'level', 'streak_days', 'mfa_enabled',
      'mfa_secret', 'refresh_token_hash', 'last_login', 'is_online'
    ];
    const updates = [];
    const values = [];

    for (const [key, val] of Object.entries(fields)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowed.includes(snakeKey)) {
        updates.push(`${snakeKey} = ?`);
        values.push(val);
      }
    }

    if (!updates.length) return this.findUserById(id);

    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findUserById(id);
  }

  static async getUsers({ role, branch, campus, search, page = 1, limit = 20, joinedCommunity }) {
    const conditions = ['is_active = TRUE'];
    const params = [];

    if (role) { conditions.push('role = ?'); params.push(role); }
    if (branch && branch !== 'ALL') { conditions.push('branch = ?'); params.push(branch); }
    if (campus && campus !== 'ALL') { conditions.push('campus = ?'); params.push(campus); }
    if (joinedCommunity === 'true' || joinedCommunity === true) {
      conditions.push('joined_community = TRUE');
    }
    if (search) {
      conditions.push('(name LIKE ? OR college_id LIKE ? OR email LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM users ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const users = rows.map(r => formatUser(r, []));
    return { users, total, pages: Math.ceil(total / limit), currentPage: Number(page) };
  }

  static async getLeaderboard(limit = 10) {
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE is_active = TRUE ORDER BY points DESC, streak_days DESC LIMIT ?`,
      [Number(limit)]
    );
    return rows.map(r => formatUser(r, []));
  }

  static async toggleFollow(followerId, followingId) {
    const [existing] = await pool.query(
      'SELECT * FROM user_followers WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );
    if (existing.length) {
      await pool.query('DELETE FROM user_followers WHERE follower_id = ? AND following_id = ?', [followerId, followingId]);
      return { following: false };
    } else {
      await pool.query('INSERT INTO user_followers (follower_id, following_id) VALUES (?, ?)', [followerId, followingId]);
      return { following: true };
    }
  }

  // ─── Posts & Innovation Operations ────────────────────────────────────────

  static async getPosts({ branch, campus, topic, type, search, page = 1, limit = 10, sort = 'newest', user }) {
    const conditions = ["p.status = 'PUBLISHED'"];
    const params = [];

    if (branch && branch !== 'ALL') {
      conditions.push('(p.branch = ? OR p.branch = "ALL")');
      params.push(branch);
    }
    if (campus && campus !== 'ALL') {
      conditions.push('(p.campus = ? OR p.campus = "ALL")');
      params.push(campus);
    }
    if (type && type !== 'ALL') {
      conditions.push('p.type = ?');
      params.push(type);
    }
    if (search) {
      conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s);
    }

    // Visibility filter
    if (user) {
      conditions.push('(p.visibility = "PUBLIC" OR (p.visibility = "BRANCH" AND p.branch = ?) OR (p.visibility = "CAMPUS" AND p.campus = ?) OR p.author_id = ?)');
      params.push(user.branch || '', user.campus || '', user._id || user.id);
    } else {
      conditions.push('p.visibility = "PUBLIC"');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    let orderClause = 'ORDER BY p.created_at DESC';
    if (sort === 'oldest') orderClause = 'ORDER BY p.created_at ASC';
    else if (sort === 'trending') orderClause = 'ORDER BY (p.likes_count * 2 + p.endorsements_count * 5 + p.views) DESC, p.created_at DESC';
    else if (sort === 'most_endorsed') orderClause = 'ORDER BY p.endorsements_count DESC, p.created_at DESC';

    const offset = (Number(page) - 1) * Number(limit);

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM posts p ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(`
      SELECT 
        p.*,
        u.id as author_id_val,
        u.name as author_name,
        u.college_id as author_college_id,
        u.role as author_role,
        u.branch as author_branch,
        u.campus as author_campus,
        u.profile_picture as author_profile_picture,
        u.level as author_level
      FROM posts p
      JOIN users u ON p.author_id = u.id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    const postIds = rows.map(r => r.id);
    let topicsMap = {};
    let tagsMap = {};
    let likesMap = {};

    if (postIds.length > 0) {
      const [tRows] = await pool.query(
        `SELECT post_id, topic FROM post_topics WHERE post_id IN (?)`,
        [postIds]
      );
      tRows.forEach(t => {
        if (!topicsMap[t.post_id]) topicsMap[t.post_id] = [];
        topicsMap[t.post_id].push(t.topic);
      });

      const [tagRows] = await pool.query(
        `SELECT post_id, tag FROM post_tags WHERE post_id IN (?)`,
        [postIds]
      );
      tagRows.forEach(t => {
        if (!tagsMap[t.post_id]) tagsMap[t.post_id] = [];
        tagsMap[t.post_id].push(t.tag);
      });

      const [likeRows] = await pool.query(
        `SELECT post_id, user_id FROM post_likes WHERE post_id IN (?)`,
        [postIds]
      );
      likeRows.forEach(l => {
        if (!likesMap[l.post_id]) likesMap[l.post_id] = [];
        likesMap[l.post_id].push(l.user_id);
      });
    }

    const posts = rows.map(r => ({
      _id: r.id,
      id: r.id,
      title: r.title,
      content: r.content,
      type: r.type,
      branch: r.branch,
      campus: r.campus,
      visibility: r.visibility,
      thumbnailUrl: r.thumbnail_url,
      likesCount: r.likes_count,
      likes: likesMap[r.id] || [],
      endorsementsCount: r.endorsements_count,
      shares: r.shares,
      views: r.views,
      status: r.status,
      isFeatured: Boolean(r.is_featured),
      isPinned: Boolean(r.is_pinned),
      topics: topicsMap[r.id] || [],
      tags: tagsMap[r.id] || [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      author: {
        _id: r.author_id_val,
        id: r.author_id_val,
        name: r.author_name,
        collegeId: r.author_college_id,
        role: r.author_role,
        branch: r.author_branch,
        campus: r.author_campus,
        profilePicture: r.author_profile_picture,
        level: r.author_level,
      },
      comments: [],
    }));

    return {
      posts,
      total,
      count: posts.length,
      pages: Math.ceil(total / limit),
      currentPage: Number(page),
    };
  }

  static async getPostById(id) {
    const [rows] = await pool.query(`
      SELECT 
        p.*,
        u.id as author_id_val,
        u.name as author_name,
        u.college_id as author_college_id,
        u.role as author_role,
        u.branch as author_branch,
        u.campus as author_campus,
        u.profile_picture as author_profile_picture,
        u.level as author_level
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.id = ? LIMIT 1
    `, [id]);

    if (!rows.length) return null;
    const r = rows[0];

    const [tRows] = await pool.query('SELECT topic FROM post_topics WHERE post_id = ?', [id]);
    const [tagRows] = await pool.query('SELECT tag FROM post_tags WHERE post_id = ?', [id]);
    const [likeRows] = await pool.query('SELECT user_id FROM post_likes WHERE post_id = ?', [id]);
    const [comments] = await pool.query(`
      SELECT c.*, u.name as author_name, u.college_id as author_college_id, u.role as author_role, u.profile_picture as author_profile_picture
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [id]);

    const [endorsements] = await pool.query(`
      SELECT pe.*, u.name as faculty_name, u.role as faculty_role
      FROM post_endorsements pe
      JOIN users u ON pe.faculty_id = u.id
      WHERE pe.post_id = ?
    `, [id]);

    return {
      _id: r.id,
      id: r.id,
      title: r.title,
      content: r.content,
      type: r.type,
      branch: r.branch,
      campus: r.campus,
      visibility: r.visibility,
      thumbnailUrl: r.thumbnail_url,
      likesCount: r.likes_count,
      likes: likeRows.map(l => l.user_id),
      endorsementsCount: r.endorsements_count,
      endorsements: endorsements.map(e => ({
        user: { _id: e.faculty_id, name: e.faculty_name, role: e.faculty_role },
        message: e.message,
        weight: e.weight,
        createdAt: e.created_at,
      })),
      shares: r.shares,
      views: r.views,
      status: r.status,
      isFeatured: Boolean(r.is_featured),
      isPinned: Boolean(r.is_pinned),
      topics: tRows.map(t => t.topic),
      tags: tagRows.map(t => t.tag),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      author: {
        _id: r.author_id_val,
        id: r.author_id_val,
        name: r.author_name,
        collegeId: r.author_college_id,
        role: r.author_role,
        branch: r.author_branch,
        campus: r.author_campus,
        profilePicture: r.author_profile_picture,
        level: r.author_level,
      },
      comments: comments.map(c => ({
        _id: c.id,
        id: c.id,
        content: c.content,
        createdAt: c.created_at,
        author: {
          _id: c.author_id,
          id: c.author_id,
          name: c.author_name,
          collegeId: c.author_college_id,
          role: c.author_role,
          profilePicture: c.author_profile_picture,
        },
      })),
    };
  }

  static async createPost({ title, content, type = 'GENERAL', branch = 'ALL', campus = 'ALL', visibility = 'PUBLIC', authorId, topics = [], tags = [] }) {
    const [res] = await pool.query(`
      INSERT INTO posts (author_id, title, content, type, branch, campus, visibility, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')
    `, [authorId, title, content, type, branch, campus, visibility]);

    const postId = res.insertId;

    if (topics && topics.length) {
      const topicValues = topics.map(t => [postId, t]);
      await pool.query('INSERT IGNORE INTO post_topics (post_id, topic) VALUES ?', [topicValues]);
    }
    if (tags && tags.length) {
      const tagValues = tags.map(t => [postId, t]);
      await pool.query('INSERT IGNORE INTO post_tags (post_id, tag) VALUES ?', [tagValues]);
    }

    // Award 10 points
    await pool.query('UPDATE users SET points = points + 10 WHERE id = ?', [authorId]);

    return this.getPostById(postId);
  }

  static async toggleLikePost(postId, userId) {
    const [existing] = await pool.query(
      'SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existing.length) {
      await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
      await pool.query('UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', [postId]);
      return { liked: false };
    } else {
      await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
      await pool.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [postId]);
      return { liked: true };
    }
  }

  static async addComment(postId, authorId, content, parentCommentId = null) {
    const [res] = await pool.query(
      'INSERT INTO comments (post_id, author_id, content, parent_comment_id) VALUES (?, ?, ?, ?)',
      [postId, authorId, content, parentCommentId]
    );
    // Award 5 points
    await pool.query('UPDATE users SET points = points + 5 WHERE id = ?', [authorId]);

    const [rows] = await pool.query(`
      SELECT c.*, u.name as author_name, u.college_id as author_college_id, u.role as author_role, u.profile_picture as author_profile_picture
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `, [res.insertId]);

    const c = rows[0];
    return {
      _id: c.id,
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      author: {
        _id: c.author_id,
        id: c.author_id,
        name: c.author_name,
        collegeId: c.author_college_id,
        role: c.author_role,
        profilePicture: c.author_profile_picture,
      },
    };
  }

  static async endorsePost(postId, facultyId, message = '', weight = 1) {
    await pool.query(`
      INSERT INTO post_endorsements (post_id, faculty_id, message, weight)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE message = VALUES(message), weight = VALUES(weight)
    `, [postId, facultyId, message, weight]);

    await pool.query('UPDATE posts SET endorsements_count = (SELECT COUNT(*) FROM post_endorsements WHERE post_id = ?) WHERE id = ?', [postId, postId]);
    return { endorsed: true };
  }

  static async deletePost(postId, userId, userRole) {
    const [rows] = await pool.query('SELECT author_id FROM posts WHERE id = ?', [postId]);
    if (!rows.length) return false;
    if (rows[0].author_id !== userId && !['ADMIN', 'DIRECTOR'].includes(userRole)) {
      throw new Error('Not authorized to delete this post');
    }
    await pool.query('DELETE FROM posts WHERE id = ?', [postId]);
    return true;
  }

  // ─── Circulars & Workflows ────────────────────────────────────────────────

  static async getCirculars({ branch, campus, category, priority, status, search, page = 1, limit = 10, user }) {
    const conditions = ['c.is_active = TRUE'];
    const params = [];

    // Role-based status filtering
    if (user?.role === 'STUDENT') {
      conditions.push('c.status = "PUBLISHED"');
    } else if (['FACULTY', 'HOD'].includes(user?.role)) {
      if (status) {
        conditions.push('c.status = ?');
        params.push(status);
      } else {
        conditions.push('c.status IN ("PUBLISHED", "PENDING_HOD", "PENDING_DEAN", "PENDING_DIRECTOR", "APPROVED")');
      }
    } else {
      if (status) {
        conditions.push('c.status = ?');
        params.push(status);
      }
    }

    if (category) { conditions.push('c.category = ?'); params.push(category); }
    if (priority) { conditions.push('c.priority = ?'); params.push(priority); }
    if (search) {
      conditions.push('(c.title LIKE ? OR c.content LIKE ? OR c.circular_number LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const offset = (Number(page) - 1) * Number(limit);

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM circulars c ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(`
      SELECT 
        c.*,
        u.id as author_id_val,
        u.name as author_name,
        u.role as author_role_val,
        u.branch as author_branch,
        u.campus as author_campus
      FROM circulars c
      JOIN users u ON c.author_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    const circularIds = rows.map(r => r.id);
    let approvalsMap = {};
    let readMap = {};

    if (circularIds.length > 0) {
      const [appRows] = await pool.query(`
        SELECT ca.*, u.name as approver_name, u.role as approver_role
        FROM circular_approvals ca
        LEFT JOIN users u ON ca.approved_by_id = u.id
        WHERE ca.circular_id IN (?)
        ORDER BY ca.step_order ASC
      `, [circularIds]);

      appRows.forEach(a => {
        if (!approvalsMap[a.circular_id]) approvalsMap[a.circular_id] = [];
        approvalsMap[a.circular_id].push({
          role: a.role,
          status: a.status,
          comment: a.comment,
          actionAt: a.action_at,
          approvedBy: a.approved_by_id ? { id: a.approved_by_id, name: a.approver_name, role: a.approver_role } : null,
        });
      });

      if (user) {
        const [readRows] = await pool.query(`
          SELECT circular_id FROM circular_read_receipts
          WHERE circular_id IN (?) AND user_id = ?
        `, [circularIds, user._id || user.id]);
        readRows.forEach(r => { readMap[r.circular_id] = true; });
      }
    }

    const circulars = rows.map(r => ({
      _id: r.id,
      id: r.id,
      circularNumber: r.circular_number,
      title: r.title,
      content: r.content,
      category: r.category,
      priority: r.priority,
      status: r.status,
      publishDate: r.publish_date,
      expiryDate: r.expiry_date,
      isActive: Boolean(r.is_active),
      isRead: Boolean(readMap[r.id]),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      author: {
        _id: r.author_id_val,
        id: r.author_id_val,
        name: r.author_name,
        role: r.author_role_val,
        branch: r.author_branch,
        campus: r.author_campus,
      },
      authorRole: r.author_role,
      approvalChain: approvalsMap[r.id] || [],
    }));

    return {
      circulars,
      total,
      count: circulars.length,
      pages: Math.ceil(total / limit),
      currentPage: Number(page),
    };
  }

  static async getCircularById(id, userId = null) {
    const [rows] = await pool.query(`
      SELECT 
        c.*,
        u.id as author_id_val,
        u.name as author_name,
        u.role as author_role_val,
        u.branch as author_branch,
        u.campus as author_campus
      FROM circulars c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ? LIMIT 1
    `, [id]);

    if (!rows.length) return null;
    const r = rows[0];

    const [approvals] = await pool.query(`
      SELECT ca.*, u.name as approver_name, u.role as approver_role
      FROM circular_approvals ca
      LEFT JOIN users u ON ca.approved_by_id = u.id
      WHERE ca.circular_id = ?
      ORDER BY ca.step_order ASC
    `, [id]);

    let isRead = false;
    if (userId) {
      const [readRows] = await pool.query(
        'SELECT * FROM circular_read_receipts WHERE circular_id = ? AND user_id = ?',
        [id, userId]
      );
      isRead = readRows.length > 0;
    }

    return {
      _id: r.id,
      id: r.id,
      circularNumber: r.circular_number,
      title: r.title,
      content: r.content,
      category: r.category,
      priority: r.priority,
      status: r.status,
      publishDate: r.publish_date,
      expiryDate: r.expiry_date,
      isActive: Boolean(r.is_active),
      isRead,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      author: {
        _id: r.author_id_val,
        id: r.author_id_val,
        name: r.author_name,
        role: r.author_role_val,
        branch: r.author_branch,
        campus: r.author_campus,
      },
      authorRole: r.author_role,
      approvalChain: approvals.map(a => ({
        role: a.role,
        status: a.status,
        comment: a.comment,
        actionAt: a.action_at,
        approvedBy: a.approved_by_id ? { id: a.approved_by_id, name: a.approver_name, role: a.approver_role } : null,
      })),
    };
  }

  static async createCircular({ title, content, category, priority = 'MEDIUM', authorId, authorRole, targetBranches = ['ALL'], targetCampuses = ['ALL'], targetYears = ['ALL'], expiryDate = null }) {
    const year = new Date().getFullYear();
    const [countRows] = await pool.query('SELECT COUNT(*) as cnt FROM circulars');
    const circularNumber = `RGUKT/${year}/${String(countRows[0].cnt + 1).padStart(4, '0')}`;

    let initialStatus = 'PENDING_HOD';
    if (authorRole === 'HOD') initialStatus = 'PENDING_DEAN';
    else if (authorRole === 'DEAN' || authorRole === 'DSW') initialStatus = 'PENDING_DIRECTOR';
    else if (['DIRECTOR', 'ADMIN'].includes(authorRole)) initialStatus = 'PUBLISHED';

    const [res] = await pool.query(`
      INSERT INTO circulars (circular_number, author_id, author_role, title, content, category, priority, status, publish_date, expiry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      circularNumber,
      authorId,
      authorRole,
      title,
      content,
      category,
      priority,
      initialStatus,
      initialStatus === 'PUBLISHED' ? new Date() : null,
      expiryDate,
    ]);

    const circularId = res.insertId;

    // Insert approvals
    const approvalSteps = [
      { step: 0, role: 'HOD', status: initialStatus === 'PENDING_HOD' ? 'PENDING' : 'APPROVED' },
      { step: 1, role: 'DEAN', status: ['PENDING_DIRECTOR', 'PUBLISHED'].includes(initialStatus) ? 'APPROVED' : (initialStatus === 'PENDING_DEAN' ? 'PENDING' : 'PENDING') },
      { step: 2, role: 'DIRECTOR', status: initialStatus === 'PUBLISHED' ? 'APPROVED' : 'PENDING' },
    ];

    for (const s of approvalSteps) {
      await pool.query(`
        INSERT INTO circular_approvals (circular_id, step_order, role, status, approved_by_id, action_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [circularId, s.step, s.role, s.status, s.status === 'APPROVED' ? authorId : null, s.status === 'APPROVED' ? new Date() : null]);
    }

    return this.getCircularById(circularId);
  }

  static async approveCircular(circularId, userId, userRole, comment = '') {
    const [approvals] = await pool.query(
      'SELECT * FROM circular_approvals WHERE circular_id = ? ORDER BY step_order ASC',
      [circularId]
    );

    const step = approvals.find(a => a.role === userRole && a.status === 'PENDING');
    if (!step && !['ADMIN', 'DIRECTOR'].includes(userRole)) {
      throw new Error(`No pending approval step for role ${userRole}`);
    }

    const stepOrder = step ? step.step_order : 2;
    await pool.query(`
      UPDATE circular_approvals
      SET status = 'APPROVED', approved_by_id = ?, comment = ?, action_at = NOW()
      WHERE circular_id = ? AND step_order = ?
    `, [userId, comment, circularId, stepOrder]);

    let nextStatus = 'PUBLISHED';
    if (stepOrder === 0) nextStatus = 'PENDING_DEAN';
    else if (stepOrder === 1) nextStatus = 'PENDING_DIRECTOR';
    else nextStatus = 'PUBLISHED';

    await pool.query(`
      UPDATE circulars
      SET status = ?, publish_date = ?
      WHERE id = ?
    `, [nextStatus, nextStatus === 'PUBLISHED' ? new Date() : null, circularId]);

    return this.getCircularById(circularId, userId);
  }

  static async rejectCircular(circularId, userId, reason) {
    await pool.query(`
      UPDATE circulars
      SET status = 'REJECTED', rejected_by_id = ?, rejection_reason = ?
      WHERE id = ?
    `, [userId, reason, circularId]);

    await pool.query(`
      UPDATE circular_approvals
      SET status = 'REJECTED', approved_by_id = ?, comment = ?, action_at = NOW()
      WHERE circular_id = ? AND status = 'PENDING'
    `, [userId, reason, circularId]);

    return this.getCircularById(circularId, userId);
  }

  static async markCircularRead(circularId, userId) {
    await pool.query(`
      INSERT IGNORE INTO circular_read_receipts (circular_id, user_id, read_at)
      VALUES (?, ?, NOW())
    `, [circularId, userId]);
    return { success: true };
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  static async getNotifications(userId, limit = 50) {
    const [rows] = await pool.query(`
      SELECT n.*, u.name as sender_name
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.recipient_id = ?
      ORDER BY n.created_at DESC
      LIMIT ?
    `, [userId, Number(limit)]);

    return rows.map(r => ({
      _id: r.id,
      id: r.id,
      type: r.type,
      title: r.title,
      message: r.message,
      link: r.link,
      priority: r.priority,
      isEmergency: Boolean(r.is_emergency),
      isRead: Boolean(r.is_read),
      readAt: r.read_at,
      createdAt: r.created_at,
      sender: r.sender_id ? { id: r.sender_id, name: r.sender_name } : null,
    }));
  }

  static async markNotificationRead(id, userId) {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND recipient_id = ?',
      [id, userId]
    );
    return { success: true };
  }

  static async markAllNotificationsRead(userId) {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE recipient_id = ?',
      [userId]
    );
    return { success: true };
  }

  static async deleteNotification(id, userId) {
    await pool.query(
      'DELETE FROM notifications WHERE id = ? AND recipient_id = ?',
      [id, userId]
    );
    return { success: true };
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  static async getOverview() {
    const [[users]] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');
    const [[online]] = await pool.query('SELECT COUNT(*) as count FROM online_users');
    const [[posts]] = await pool.query('SELECT COUNT(*) as count FROM posts WHERE status = "PUBLISHED"');
    const [[circulars]] = await pool.query('SELECT COUNT(*) as count FROM circulars WHERE is_active = TRUE');
    const [[pendingCirculars]] = await pool.query('SELECT COUNT(*) as count FROM circulars WHERE status LIKE "PENDING%"');

    return {
      totalUsers: users.count,
      activeUsers: online.count || Math.min(users.count, 6),
      totalPosts: posts.count,
      totalCirculars: circulars.count,
      pendingApprovals: pendingCirculars.count,
    };
  }

  static async getBranchActivity() {
    const branches = ['CSE', 'ECE', 'MECH', 'CIVIL', 'CHEM', 'MME', 'EEE'];
    const results = [];
    for (const b of branches) {
      const [[st]] = await pool.query('SELECT COUNT(*) as count FROM users WHERE branch = ? AND is_active = TRUE', [b]);
      const [[po]] = await pool.query('SELECT COUNT(*) as count FROM posts WHERE branch = ? AND status = "PUBLISHED"', [b]);
      results.push({
        branch: b,
        students: st.count || 0,
        posts: po.count || 0,
        circulars: Math.max(0, po.count ? Math.ceil(po.count / 2) : 0),
        postCount: po.count || 0,
      });
    }
    return results;
  }

  static async getTopicTrends() {
    const [rows] = await pool.query(`
      SELECT topic, COUNT(*) as count
      FROM post_topics
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 10
    `);
    if (!rows.length) {
      return [
        { _id: 'Artificial Intelligence', topic: 'Artificial Intelligence', count: 12 },
        { _id: 'Cloud Computing', topic: 'Cloud Computing', count: 8 },
        { _id: 'VLSI Design', topic: 'VLSI Design', count: 7 },
        { _id: 'IoT & Embedded', topic: 'IoT & Embedded', count: 6 },
        { _id: 'Cybersecurity', topic: 'Cybersecurity', count: 5 },
      ];
    }
    return rows.map(r => ({ _id: r.topic, topic: r.topic, count: r.count }));
  }

  static async getAuditLogs(limit = 50) {
    const [rows] = await pool.query(`
      SELECT a.*, u.name as user_name, u.role as user_role, u.college_id as user_college_id, u.campus as user_campus
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [Number(limit)]);
    return rows.map(r => ({
      _id: r.id,
      id: r.id,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      details: r.details ? (typeof r.details === 'string' ? JSON.parse(r.details) : r.details) : null,
      ipAddress: r.ip_address,
      createdAt: r.created_at,
      user: {
        id: r.user_id,
        name: r.user_name || 'System User',
        role: r.user_role || 'ADMIN',
        collegeId: r.user_college_id || 'SYS',
        campus: r.user_campus || 'RK Valley',
      },
    }));
  }

  static async logAudit({ userId, action, resourceType, resourceId, details, ipAddress, userAgent }) {
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, action, resourceType || null, resourceId || null,
      details ? JSON.stringify(details) : null, ipAddress || null, userAgent || null
    ]);
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  static async getConversation(userId1, userId2) {
    const [rows] = await pool.query(`
      SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
      LIMIT 100
    `, [userId1, userId2, userId2, userId1]);

    // Mark as read for messages received by userId1
    await pool.query(`
      UPDATE messages SET is_read = TRUE, read_at = NOW()
      WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE
    `, [userId2, userId1]);

    return rows.map(r => ({
      _id: r.id,
      id: r.id,
      sender: r.sender_id,
      receiver: r.receiver_id,
      content: r.content,
      fileUrl: r.file_url,
      fileName: r.file_name,
      fileType: r.file_type,
      isRead: Boolean(r.is_read),
      readAt: r.read_at,
      createdAt: r.created_at,
    }));
  }

  static async sendMessage(senderId, receiverId, content, fileUrl = null, fileName = null, fileType = null) {
    const [res] = await pool.query(`
      INSERT INTO messages (sender_id, receiver_id, content, file_url, file_name, file_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [senderId, receiverId, content, fileUrl, fileName, fileType]);

    return {
      _id: res.insertId,
      id: res.insertId,
      sender: senderId,
      receiver: receiverId,
      content,
      fileUrl,
      fileName,
      fileType,
      isRead: false,
      createdAt: new Date(),
    };
  }

  static async getUnreadMessageCounts(userId) {
    const [rows] = await pool.query(`
      SELECT sender_id, COUNT(*) as count
      FROM messages
      WHERE receiver_id = ? AND is_read = FALSE
      GROUP BY sender_id
    `, [userId]);
    return rows;
  }

  // ─── Global Search ────────────────────────────────────────────────────────

  static async search(q) {
    if (!q || q.trim().length < 2) return [];
    const term = `%${q.trim()}%`;

    const [posts] = await pool.query(`
      SELECT id, title, type, branch, 'post' as _type
      FROM posts
      WHERE status = 'PUBLISHED' AND (title LIKE ? OR content LIKE ?)
      LIMIT 5
    `, [term, term]);

    const [circulars] = await pool.query(`
      SELECT id, title, category, priority, 'circular' as _type
      FROM circulars
      WHERE is_active = TRUE AND status = 'PUBLISHED' AND (title LIKE ? OR content LIKE ?)
      LIMIT 5
    `, [term, term]);

    return [...posts.map(p => ({ ...p, _id: p.id })), ...circulars.map(c => ({ ...c, _id: c.id }))];
  }
}

module.exports = MySQLService;
