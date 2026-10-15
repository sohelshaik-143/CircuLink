const MySQLService = require('../services/mysqlService');

// @route   GET /api/posts
exports.getPosts = async (req, res) => {
  try {
    const { branch, campus, topic, type, search, page = 1, limit = 10, sort = 'newest' } = req.query;
    const result = await MySQLService.getPosts({
      branch,
      campus,
      topic,
      type,
      search,
      page,
      limit,
      sort,
      user: req.user,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('getPosts Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/posts
exports.createPost = async (req, res) => {
  try {
    let { title, content, type, topics, tags, branch, campus, visibility } = req.body;

    if (typeof topics === 'string') topics = [topics];
    if (typeof tags === 'string') tags = tags.split(',').map(t => t.trim()).filter(Boolean);

    const post = await MySQLService.createPost({
      title,
      content,
      type: type || 'GENERAL',
      branch: branch || req.user.branch || 'ALL',
      campus: campus || req.user.campus || 'ALL',
      visibility: visibility || 'PUBLIC',
      authorId: req.user._id || req.user.id,
      topics,
      tags,
    });

    await MySQLService.logAudit({
      userId: req.user._id || req.user.id,
      action: 'CREATE_POST',
      resourceType: 'Post',
      resourceId: post.id,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, post });
  } catch (err) {
    console.error('createPost Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   GET /api/posts/:id
exports.getPost = async (req, res) => {
  try {
    const post = await MySQLService.getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   PUT /api/posts/:id
exports.updatePost = async (req, res) => {
  try {
    const post = await MySQLService.getPostById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
  try {
    await MySQLService.deletePost(req.params.id, req.user._id || req.user.id, req.user.role);
    res.json({ success: true, message: 'Post deleted successfully.' });
  } catch (err) {
    res.status(403).json({ success: false, message: err.message });
  }
};

// @route   POST /api/posts/:id/like
exports.likePost = async (req, res) => {
  try {
    const result = await MySQLService.toggleLikePost(req.params.id, req.user._id || req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/posts/:id/endorse
exports.endorsePost = async (req, res) => {
  try {
    const { message } = req.body;
    const result = await MySQLService.endorsePost(
      req.params.id,
      req.user._id || req.user.id,
      message || '',
      req.user.role === 'DIRECTOR' ? 3 : (req.user.role === 'HOD' ? 2 : 1)
    );
    res.json({ success: true, message: 'Post endorsed successfully.', ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/posts/:id/comment
exports.addComment = async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required.' });
    }

    const comment = await MySQLService.addComment(
      req.params.id,
      req.user._id || req.user.id,
      content.trim(),
      parentComment || null
    );

    res.status(201).json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
