const MySQLService = require('../services/mysqlService');

// @route   GET /api/circulars
exports.getCirculars = async (req, res) => {
  try {
    const { branch, campus, category, priority, status, page = 1, limit = 10, search } = req.query;
    const result = await MySQLService.getCirculars({
      branch,
      campus,
      category,
      priority,
      status,
      search,
      page,
      limit,
      user: req.user,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('getCirculars Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/circulars
exports.createCircular = async (req, res) => {
  try {
    const { title, content, category, priority, targetBranches, targetCampuses, targetYears, expiryDate } = req.body;
    const canCreate = ['FACULTY', 'HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN'];

    if (!canCreate.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to create circulars.' });
    }

    const circular = await MySQLService.createCircular({
      title,
      content,
      category,
      priority: priority || 'MEDIUM',
      authorId: req.user._id || req.user.id,
      authorRole: req.user.role,
      targetBranches: targetBranches || ['ALL'],
      targetCampuses: targetCampuses || ['ALL'],
      targetYears: targetYears || ['ALL'],
      expiryDate: expiryDate || null,
    });

    await MySQLService.logAudit({
      userId: req.user._id || req.user.id,
      action: 'CREATE_CIRCULAR',
      resourceType: 'Circular',
      resourceId: circular.id,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, circular });
  } catch (err) {
    console.error('createCircular Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   GET /api/circulars/:id
exports.getCircular = async (req, res) => {
  try {
    const circular = await MySQLService.getCircularById(req.params.id, req.user?._id || req.user?.id);
    if (!circular) return res.status(404).json({ success: false, message: 'Circular not found.' });

    res.json({ success: true, circular });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   PUT /api/circulars/:id/approve
exports.approveCircular = async (req, res) => {
  try {
    const { comment } = req.body;
    const circular = await MySQLService.approveCircular(
      req.params.id,
      req.user._id || req.user.id,
      req.user.role,
      comment || ''
    );

    await MySQLService.logAudit({
      userId: req.user._id || req.user.id,
      action: 'APPROVE_CIRCULAR',
      resourceType: 'Circular',
      resourceId: circular.id,
      details: { comment },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Circular approved successfully.', circular });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @route   PUT /api/circulars/:id/reject
exports.rejectCircular = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
    }

    const circular = await MySQLService.rejectCircular(
      req.params.id,
      req.user._id || req.user.id,
      reason.trim()
    );

    await MySQLService.logAudit({
      userId: req.user._id || req.user.id,
      action: 'REJECT_CIRCULAR',
      resourceType: 'Circular',
      resourceId: circular.id,
      details: { reason },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Circular rejected.', circular });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @route   POST /api/circulars/:id/read
exports.markRead = async (req, res) => {
  try {
    await MySQLService.markCircularRead(req.params.id, req.user._id || req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/circulars/emergency
exports.emergency = async (req, res) => {
  try {
    const { title, content } = req.body;
    const canBroadcast = ['SECURITY', 'DEAN', 'DIRECTOR', 'ADMIN'];
    if (!canBroadcast.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized for emergency broadcast.' });
    }

    const circular = await MySQLService.createCircular({
      title: `🚨 EMERGENCY: ${title}`,
      content,
      category: 'EMERGENCY',
      priority: 'URGENT',
      authorId: req.user._id || req.user.id,
      authorRole: req.user.role,
      targetBranches: ['ALL'],
      targetCampuses: ['ALL'],
      targetYears: ['ALL'],
    });

    // Notify all active users
    const [allUsers] = await require('../config/mysql').query('SELECT id FROM users WHERE is_active = TRUE');
    for (const u of allUsers) {
      await require('../config/mysql').query(`
        INSERT INTO notifications (recipient_id, sender_id, type, title, message, priority, is_emergency, related_circular_id)
        VALUES (?, ?, 'EMERGENCY', ?, ?, 'URGENT', TRUE, ?)
      `, [u.id, req.user._id || req.user.id, `🚨 EMERGENCY: ${title}`, content, circular.id]);
    }

    res.status(201).json({ success: true, message: 'Emergency circular broadcasted.', circular });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
