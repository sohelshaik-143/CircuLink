const Post = require('../models/Post');
const { Comment, Notification, AuditLog } = require('../models/Other');
const User = require('../models/User');

// @route   GET /api/posts
exports.getPosts = async (req, res) => {
  try {
    const { branch, campus, topic, type, search, page = 1, limit = 10, sort = '-createdAt' } = req.query;
    const query = { status: 'PUBLISHED' };

    if (branch && branch !== 'ALL') query.branch = branch;
    if (campus && campus !== 'ALL') query.campus = campus;
    if (topic) query.topics = { $in: [topic] };
    if (type) query.type = type;
    if (search) query.$text = { $search: search };

    // Visibility filter
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

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('author', 'name collegeId role branch campus profilePicture level')
      .populate('comments', '_id')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      count: posts.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page),
      posts,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/posts
exports.createPost = async (req, res) => {
  try {
    let { title, content, type, topics, tags, branch, campus, visibility } = req.body;

    // Handle FormData array serialization cases
    if (typeof topics === 'string') topics = [topics];
    if (typeof tags === 'string') tags = tags.split(',').map(t => t.trim()).filter(Boolean);

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.originalname,
        url: `/uploads/${file.filename}`,
        type: file.mimetype.startsWith('image/') ? 'image' :
          file.mimetype === 'application/pdf' ? 'pdf' :
            file.mimetype.includes('word') ? 'doc' : 'other',
        size: file.size
      }));
    }

    const post = await Post.create({
      title, content, type, topics, tags,
      attachments,
      branch: branch || req.user.branch,
      campus: campus || req.user.campus,
      visibility,
      author: req.user._id,
    });

    await req.user.addPoints(10);
    await AuditLog.create({ user: req.user._id, action: 'CREATE_POST', resourceId: post._id, resourceType: 'Post' });

    const populated = await post.populate('author', 'name collegeId role branch profilePicture');
    res.status(201).json({ success: true, post: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   GET /api/posts/:id
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name collegeId role branch campus profilePicture level badges')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'name collegeId role profilePicture' },
      })
      .populate('endorsements.user', 'name role');

    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    post.views += 1;
    await post.save({ validateBeforeSave: false });

    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   PUT /api/posts/:id
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Save version history
    post.versions.push({ version: post.version, content: post.content, editedAt: new Date(), editedBy: req.user._id });
    post.version += 1;

    const { title, content, topics, tags } = req.body;
    if (title) post.title = title;
    if (content) post.content = content;
    if (topics) post.topics = topics;
    if (tags) post.tags = tags;

    await post.save();
    await AuditLog.create({ user: req.user._id, action: 'EDIT_POST', resourceId: post._id, resourceType: 'Post' });

    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/posts/:id/like
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const alreadyLiked = post.likes.includes(req.user._id);
    if (alreadyLiked) {
      post.likes.pull(req.user._id);
    } else {
      post.likes.push(req.user._id);
      // Notify author
      if (post.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: 'POST_LIKED',
          title: 'Your post was liked',
          message: `${req.user.name} liked your post "${post.title}"`,
          relatedPost: post._id,
        });
      }
      await AuditLog.create({ user: req.user._id, action: 'LIKE_POST', resourceId: post._id, resourceType: 'Post' });
    }
    await post.save({ validateBeforeSave: false });

    res.json({ success: true, liked: !alreadyLiked, likesCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/posts/:id/endorse
exports.endorsePost = async (req, res) => {
  try {
    const canEndorse = ['FACULTY', 'HOD', 'DEAN', 'DIRECTOR', 'DSW'];
    if (!canEndorse.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only faculty/officials can endorse posts.' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const alreadyEndorsed = post.endorsements.find(e => e.user.toString() === req.user._id.toString());
    if (alreadyEndorsed) return res.status(400).json({ success: false, message: 'Already endorsed.' });

    post.endorsements.push({ user: req.user._id, message: req.body.message });
    await post.save({ validateBeforeSave: false });

    const author = await User.findById(post.author);
    await author.addPoints(50);

    await Notification.create({
      recipient: post.author,
      sender: req.user._id,
      type: 'POST_ENDORSED',
      title: 'Your post was endorsed!',
      message: `${req.user.name} (${req.user.role}) endorsed your post "${post.title}"`,
      relatedPost: post._id,
    });

    res.json({ success: true, message: 'Post endorsed.', endorsementsCount: post.endorsements.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/posts/:id/comment
exports.addComment = async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const comment = await Comment.create({ content, author: req.user._id, post: post._id, parentComment });
    post.comments.push(comment._id);
    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, { $push: { replies: comment._id } });
    }
    await post.save({ validateBeforeSave: false });

    await req.user.addPoints(5);
    const populated = await comment.populate('author', 'name collegeId role profilePicture');

    await Notification.create({
      recipient: post.author,
      sender: req.user._id,
      type: 'POST_COMMENTED',
      title: 'New comment on your post',
      message: `${req.user.name} commented on "${post.title}"`,
      relatedPost: post._id,
    });

    res.status(201).json({ success: true, comment: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
