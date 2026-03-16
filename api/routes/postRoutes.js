// api/routes/postRoutes.js
// Complete Innovation/Post feed API

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { protect, optionalAuth } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const Post = require('../../models/Post');
const { Comment, Notification, AuditLog } = require('../../models/Other');
const User = require('../../models/User');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
  next();
};

const postCreateValidator = [
  body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Title required (max 200 chars)'),
  body('content').trim().notEmpty().isLength({ max: 5000 }).withMessage('Content required (max 5000 chars)'),
  body('type').optional().isIn(['INNOVATION', 'RESEARCH', 'PROJECT', 'IDEA', 'SOCIAL_SERVICE', 'ACHIEVEMENT', 'GENERAL']),
  body('visibility').optional().isIn(['PUBLIC', 'BRANCH', 'CAMPUS', 'DEPARTMENT']),
  body('topics').optional().isArray(),
];

// ─── GET /api/posts ──────────────────────────────────────────────────────────
/**
 * @desc    Feed of all innovation posts (filterable)
 * @query   branch, campus, topic, type, search, page, limit, sort
 *          sort: newest | oldest | trending | most_endorsed
 * @access  Public/Private
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      branch, campus, topic, type, search,
      page = 1, limit = 10,
      sort = 'newest',
      author, featured,
    } = req.query;

    const query = { status: 'PUBLISHED' };
    if (branch && branch !== 'ALL') query.branch = branch;
    if (campus && campus !== 'ALL') query.campus = campus;
    if (topic) query.topics = { $in: topic.split(',') };
    if (type) query.type = { $in: type.split(',') };
    if (author) query.author = author;
    if (featured === 'true') query.isFeatured = true;
    if (search) query.$text = { $search: search };

    // Visibility rules
    if (req.user) {
      query.$or = [
        { visibility: 'PUBLIC' },
        { visibility: 'BRANCH', branch: req.user.branch },
        { visibility: 'CAMPUS', campus: req.user.campus },
        { author: req.user._id },
      ];
    } else {
      query.visibility = 'PUBLIC';
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      trending: { likesCount: -1, views: -1 },
      most_endorsed: { endorsementsCount: -1 },
      most_viewed: { views: -1 },
    };
    const sortOpt = sortMap[sort] || { createdAt: -1 };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'name collegeId role branch campus profilePicture level badges')
        .select('-versions')
        .sort(sortOpt)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Post.countDocuments(query),
    ]);

    // Add isLiked flag for authenticated users
    const postsWithFlags = posts.map(p => ({
      ...p,
      isLiked: req.user ? p.likes?.some(id => id.toString() === req.user._id.toString()) : false,
      isBookmarked: req.user ? p.bookmarks?.some(id => id.toString() === req.user._id.toString()) : false,
    }));

    res.json({
      success: true, count: posts.length, total,
      pages: Math.ceil(total / limit), currentPage: Number(page),
      posts: postsWithFlags,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/posts ─────────────────────────────────────────────────────────
/**
 * @desc    Create a new innovation post
 * @access  Private (any logged-in user)
 * @body    { title, content, type, topics, tags, branch, campus, visibility }
 */
router.post('/', protect, postCreateValidator, validate, async (req, res) => {
  try {
    const { title, content, type, topics, tags, visibility, branch, campus, isAnonymous } = req.body;
    const post = await Post.create({
      title, content, type: type || 'GENERAL', topics: topics || [], tags: tags || [],
      branch: branch || req.user.branch || 'ALL',
      campus: campus || req.user.campus || 'ALL',
      visibility: visibility || 'PUBLIC',
      author: req.user._id,
      isAnonymous: isAnonymous || false,
      status: 'PUBLISHED',
      likesCount: 0, commentsCount: 0, endorsementsCount: 0, views: 0, shares: 0,
    });

    // Award points
    const User = require('../../models/User');
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 10 } });

    // Notify followers
    const author = await User.findById(req.user._id).populate('followers', '_id');
    if (author.followers.length > 0) {
      await Notification.insertMany(
        author.followers.slice(0, 50).map(f => ({
          recipient: f._id,
          sender: req.user._id,
          type: 'NEW_POST',
          title: `New post by ${req.user.name}`,
          message: `"${title}" — check it out!`,
          relatedPost: post._id,
          priority: 'LOW',
        }))
      );
    }

    await AuditLog.create({ user: req.user._id, action: 'CREATE_POST', resourceId: post._id, resourceType: 'Post', campus: req.user.campus, branch: req.user.branch });

    const populated = await post.populate('author', 'name collegeId role branch campus profilePicture level');
    res.status(201).json({ success: true, post: populated, pointsEarned: 10 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/posts/trending ─────────────────────────────────────────────────
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const posts = await Post.find({ status: 'PUBLISHED', visibility: 'PUBLIC' })
      .populate('author', 'name role branch campus profilePicture')
      .sort({ likesCount: -1, views: -1, createdAt: -1 })
      .limit(10)
      .select('title topics branch campus likesCount commentsCount views endorsementsCount createdAt author');
    res.json({ success: true, posts });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── GET /api/posts/:id ──────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name collegeId role branch campus profilePicture level badges bio points')
      .populate({
        path: 'comments',
        match: { isDeleted: { $ne: true }, parentComment: null },
        populate: [
          { path: 'author', select: 'name collegeId role profilePicture' },
          { path: 'replies', populate: { path: 'author', select: 'name collegeId role profilePicture' } },
        ],
        options: { sort: { createdAt: 1 }, limit: 50 },
      })
      .populate('endorsements.user', 'name role branch designation');

    if (!post || post.status === 'ARCHIVED') {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    // Increment views (async, non-blocking)
    Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

    const postObj = post.toObject();
    postObj.isLiked = req.user ? post.likes.some(id => id.toString() === req.user._id.toString()) : false;
    postObj.isBookmarked = req.user ? post.bookmarks?.some(id => id.toString() === req.user._id.toString()) : false;

    res.json({ success: true, post: postObj });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── PUT /api/posts/:id ──────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (post.author.toString() !== req.user._id.toString() && !['ADMIN', 'DEAN', 'DIRECTOR'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this post.' });
    }

    // Save version
    post.versions.push({ version: post.version, title: post.title, content: post.content, editedAt: new Date(), editedBy: req.user._id });
    post.version += 1;

    const { title, content, topics, tags, visibility } = req.body;
    if (title) post.title = title;
    if (content) post.content = content;
    if (topics) post.topics = topics;
    if (tags) post.tags = tags;
    if (visibility) post.visibility = visibility;

    await post.save();
    await AuditLog.create({ user: req.user._id, action: 'EDIT_POST', resourceId: post._id, resourceType: 'Post' });

    res.json({ success: true, post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── DELETE /api/posts/:id ───────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (post.author.toString() !== req.user._id.toString() && !['ADMIN', 'DEAN', 'DIRECTOR'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    await post.deleteOne();
    await Comment.deleteMany({ post: post._id });
    await AuditLog.create({ user: req.user._id, action: 'DELETE_POST', resourceId: post._id, resourceType: 'Post' });
    res.json({ success: true, message: 'Post deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/posts/:id/like ────────────────────────────────────────────────
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const idx = post.likes.findIndex(id => id.toString() === req.user._id.toString());
    if (idx > -1) {
      post.likes.splice(idx, 1);
      post.likesCount = Math.max(0, (post.likesCount || 1) - 1);
    } else {
      post.likes.push(req.user._id);
      post.likesCount = (post.likesCount || 0) + 1;

      if (post.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: post.author, sender: req.user._id, type: 'POST_LIKED',
          title: 'Your post was liked! ❤️',
          message: `${req.user.name} liked "${post.title}"`,
          relatedPost: post._id, priority: 'LOW',
        });
      }
    }
    await post.save({ validateBeforeSave: false });
    await AuditLog.create({ user: req.user._id, action: 'LIKE_POST', resourceId: post._id, resourceType: 'Post' });

    res.json({ success: true, liked: idx === -1, likesCount: post.likesCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/posts/:id/bookmark ───────────────────────────────────────────
router.post('/:id/bookmark', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const idx = post.bookmarks?.findIndex(id => id.toString() === req.user._id.toString()) ?? -1;
    if (!post.bookmarks) post.bookmarks = [];

    if (idx > -1) {
      post.bookmarks.splice(idx, 1);
    } else {
      post.bookmarks.push(req.user._id);
    }
    await post.save({ validateBeforeSave: false });
    res.json({ success: true, bookmarked: idx === -1 });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/posts/:id/endorse ─────────────────────────────────────────────
router.post('/:id/endorse', protect, authorize('FACULTY', 'HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const already = post.endorsements.find(e => e.user.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ success: false, message: 'You already endorsed this post.' });

    post.endorsements.push({ user: req.user._id, message: req.body.message || '', role: req.user.role });
    post.endorsementsCount = (post.endorsementsCount || 0) + 1;
    await post.save({ validateBeforeSave: false });

    // Award 50 points to post author
    await User.findByIdAndUpdate(post.author._id, { $inc: { points: 50 } });

    await Notification.create({
      recipient: post.author._id, sender: req.user._id, type: 'POST_ENDORSED',
      title: '🏅 Your post was endorsed!',
      message: `${req.user.name} (${req.user.role}, ${req.user.designation || req.user.branch}) endorsed "${post.title}". +50 points!`,
      relatedPost: post._id, priority: 'HIGH',
    });

    res.json({ success: true, message: 'Post endorsed!', endorsementsCount: post.endorsementsCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/posts/:id/comment ─────────────────────────────────────────────
router.post('/:id/comment', protect, [
  body('content').trim().notEmpty().isLength({ max: 1000 }).withMessage('Comment required (max 1000 chars)'),
], validate, async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const comment = await Comment.create({
      content, author: req.user._id, post: post._id,
      parentComment: parentComment || null,
      depth: parentComment ? 1 : 0,
    });

    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, { $push: { replies: comment._id } });
    }

    post.comments.push(comment._id);
    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save({ validateBeforeSave: false });

    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 5 } });

    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.author, sender: req.user._id, type: 'POST_COMMENTED',
        title: 'New comment on your post 💬',
        message: `${req.user.name} commented: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`,
        relatedPost: post._id, priority: 'MEDIUM',
      });
    }

    await AuditLog.create({ user: req.user._id, action: 'COMMENT', resourceId: post._id, resourceType: 'Post' });

    const populated = await comment.populate('author', 'name collegeId role profilePicture branch');
    res.status(201).json({ success: true, comment: populated, pointsEarned: 5 });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── DELETE /api/posts/:id/comment/:commentId ────────────────────────────────
router.delete('/:id/comment/:commentId', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });
    if (comment.author.toString() !== req.user._id.toString() && !['ADMIN', 'DEAN', 'DIRECTOR'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.deletedBy = req.user._id;
    comment.content = '[deleted]';
    await comment.save();
    await Post.findByIdAndUpdate(req.params.id, { $inc: { commentsCount: -1 } });
    res.json({ success: true, message: 'Comment deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/posts/:id/flag ─────────────────────────────────────────────────
router.post('/:id/flag', protect, authorize('FACULTY', 'HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN'), async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, {
      status: 'FLAGGED', flaggedReason: req.body.reason, flaggedBy: req.user._id,
    });
    res.json({ success: true, message: 'Post flagged for review.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/posts/:id/feature ─────────────────────────────────────────────
router.post('/:id/feature', protect, authorize('HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN'), async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { isFeatured: true }, { new: true });
    res.json({ success: true, message: 'Post featured!', post });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── GET /api/posts/:id/versions ─────────────────────────────────────────────
router.get('/:id/versions', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select('versions version title author');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    res.json({ success: true, currentVersion: post.version, versions: post.versions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
