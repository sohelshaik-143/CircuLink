const Circular = require('../models/Circular');
const { Notification, AuditLog } = require('../models/Other');
const User = require('../models/User');

// @route   GET /api/circulars
exports.getCirculars = async (req, res) => {
  try {
    const { branch, campus, category, priority, status, page = 1, limit = 10, search } = req.query;
    const query = {};

    // Role-based visibility
    if (req.user.role === 'STUDENT') {
      query.status = 'PUBLISHED';
      query.$or = [
        { targetBranches: { $in: ['ALL', req.user.branch] } },
        { targetBranches: { $size: 0 } },
      ];
    } else if (['FACULTY', 'HOD'].includes(req.user.role)) {
      query.status = { $in: ['PUBLISHED', 'PENDING_HOD', 'PENDING_DEAN', 'PENDING_DIRECTOR'] };
    } else {
      if (status) query.status = status;
    }

    if (branch && branch !== 'ALL') query.targetBranches = branch;
    if (campus && campus !== 'ALL') query.targetCampuses = campus;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) query.$text = { $search: search };

    const total = await Circular.countDocuments(query);
    const circulars = await Circular.find(query)
      .populate('author', 'name role branch campus')
      .populate('approvalChain.approvedBy', 'name role')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Add isRead flag for current user
    const circularData = circulars.map(c => {
      const isRead = c.readBy.some(r => r.user.toString() === req.user._id.toString());
      return { ...c.toObject(), isRead };
    });

    res.json({ success: true, count: circulars.length, total, pages: Math.ceil(total / limit), circulars: circularData });
  } catch (err) {
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

    let initialStatus = 'PENDING_HOD';
    const approvalChain = [
      { role: 'HOD', status: 'PENDING' },
      { role: 'DEAN', status: 'PENDING' },
      { role: 'DIRECTOR', status: 'PENDING' },
    ];

    // If created by HOD or above, skip some steps
    if (req.user.role === 'HOD') {
      approvalChain[0].status = 'APPROVED';
      approvalChain[0].approvedBy = req.user._id;
      approvalChain[0].actionAt = new Date();
      initialStatus = 'PENDING_DEAN';
    } else if (req.user.role === 'DEAN') {
      approvalChain[0].status = approvalChain[1].status = 'APPROVED';
      approvalChain[0].approvedBy = approvalChain[1].approvedBy = req.user._id;
      initialStatus = 'PENDING_DIRECTOR';
    } else if (['DIRECTOR', 'ADMIN'].includes(req.user.role)) {
      approvalChain.forEach(a => { a.status = 'APPROVED'; a.approvedBy = req.user._id; a.actionAt = new Date(); });
      initialStatus = 'PUBLISHED';
    }

    const circular = await Circular.create({
      title, content, category, priority,
      targetBranches: targetBranches || ['ALL'],
      targetCampuses: targetCampuses || ['ALL'],
      targetYears: targetYears || ['ALL'],
      author: req.user._id,
      authorRole: req.user.role,
      approvalChain,
      status: initialStatus,
      expiryDate,
    });

    // Notify HODs if pending their approval
    if (initialStatus === 'PENDING_HOD') {
      const hods = await User.find({ role: 'HOD', campus: req.user.campus });
      await Notification.insertMany(hods.map(hod => ({
        recipient: hod._id,
        sender: req.user._id,
        type: 'APPROVAL_REQUIRED',
        title: 'Circular Approval Required',
        message: `New circular "${title}" needs your approval.`,
        relatedCircular: circular._id,
        priority: 'HIGH',
      })));
    }

    await AuditLog.create({ user: req.user._id, action: 'CREATE_CIRCULAR', resourceId: circular._id, resourceType: 'Circular' });

    res.status(201).json({ success: true, circular });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   PUT /api/circulars/:id/approve
exports.approveCircular = async (req, res) => {
  try {
    const { comment } = req.body;
    const approverRoles = ['HOD', 'DEAN', 'DIRECTOR'];
    if (!approverRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to approve circulars.' });
    }

    const circular = await Circular.findById(req.params.id);
    if (!circular) return res.status(404).json({ success: false, message: 'Circular not found.' });

    const stepMap = { HOD: 0, DEAN: 1, DIRECTOR: 2 };
    // DSW acts like Dean
    const role = req.user.role === 'DSW' ? 'DEAN' : req.user.role;
    const step = stepMap[role];

    if (circular.approvalChain[step].status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'This step is not pending your approval.' });
    }

    circular.approvalChain[step].status = 'APPROVED';
    circular.approvalChain[step].approvedBy = req.user._id;
    circular.approvalChain[step].comment = comment;
    circular.approvalChain[step].actionAt = new Date();

    // Advance status
    const nextStatuses = { 0: 'PENDING_DEAN', 1: 'PENDING_DIRECTOR', 2: 'PUBLISHED' };
    circular.status = nextStatuses[step];
    if (circular.status === 'PUBLISHED') circular.publishDate = new Date();

    await circular.save();

    // Notify next approver or author
    if (circular.status === 'PUBLISHED') {
      const author = await User.findById(circular.author);
      await Notification.create({
        recipient: circular.author, sender: req.user._id,
        type: 'CIRCULAR_APPROVED',
        title: 'Circular Published!',
        message: `Your circular "${circular.title}" has been approved and published.`,
        relatedCircular: circular._id,
      });

      // Notify all target users
      const targetQuery = {};
      if (!circular.targetBranches.includes('ALL')) targetQuery.branch = { $in: circular.targetBranches };
      if (!circular.targetCampuses.includes('ALL')) targetQuery.campus = { $in: circular.targetCampuses };
      const targetUsers = await User.find(targetQuery).select('_id').limit(500);
      if (targetUsers.length > 0) {
        await Notification.insertMany(targetUsers.map(u => ({
          recipient: u._id,
          type: 'NEW_CIRCULAR',
          title: `New Circular: ${circular.title}`,
          message: `A new ${circular.category} circular has been published.`,
          relatedCircular: circular._id,
          priority: circular.priority,
        })));
      }
    } else {
      const nextRoleMap = { 'PENDING_DEAN': 'DEAN', 'PENDING_DIRECTOR': 'DIRECTOR' };
      const nextRole = nextRoleMap[circular.status];
      if (nextRole) {
        const nextApprovers = await User.find({ role: nextRole });
        await Notification.insertMany(nextApprovers.map(u => ({
          recipient: u._id, sender: req.user._id,
          type: 'APPROVAL_REQUIRED',
          title: 'Circular Approval Required',
          message: `Circular "${circular.title}" needs your approval.`,
          relatedCircular: circular._id, priority: 'HIGH',
        })));
      }
    }

    await AuditLog.create({
      user: req.user._id, action: 'APPROVE_CIRCULAR',
      resourceId: circular._id, resourceType: 'Circular',
      details: { step, comment },
    });

    res.json({ success: true, message: 'Circular approved.', circular });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   PUT /api/circulars/:id/reject
exports.rejectCircular = async (req, res) => {
  try {
    const { reason } = req.body;
    const circular = await Circular.findById(req.params.id);
    if (!circular) return res.status(404).json({ success: false, message: 'Circular not found.' });

    circular.status = 'REJECTED';
    circular.rejectionReason = reason;
    const step = { HOD: 0, DEAN: 1, DIRECTOR: 2 }[req.user.role];
    if (step !== undefined) {
      circular.approvalChain[step].status = 'REJECTED';
      circular.approvalChain[step].approvedBy = req.user._id;
      circular.approvalChain[step].comment = reason;
      circular.approvalChain[step].actionAt = new Date();
    }
    await circular.save();

    await Notification.create({
      recipient: circular.author,
      sender: req.user._id,
      type: 'CIRCULAR_REJECTED',
      title: 'Circular Rejected',
      message: `Your circular "${circular.title}" was rejected. Reason: ${reason}`,
      relatedCircular: circular._id,
    });

    await AuditLog.create({ user: req.user._id, action: 'REJECT_CIRCULAR', resourceId: circular._id, resourceType: 'Circular', details: { reason } });
    res.json({ success: true, message: 'Circular rejected.', circular });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/circulars/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const circular = await Circular.findById(req.params.id);
    if (!circular) return res.status(404).json({ success: false, message: 'Circular not found.' });

    const alreadyRead = circular.readBy.some(r => r.user.toString() === req.user._id.toString());
    if (!alreadyRead) {
      circular.readBy.push({ user: req.user._id });
      await circular.save({ validateBeforeSave: false });
    }
    res.json({ success: true, message: 'Marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/circulars/emergency
exports.broadcastEmergency = async (req, res) => {
  try {
    if (!['SECURITY', 'DEAN', 'DIRECTOR', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to broadcast emergencies.' });
    }
    const { title, content, targetCampuses } = req.body;

    const circular = await Circular.create({
      title, content,
      category: 'EMERGENCY',
      priority: 'URGENT',
      targetBranches: ['ALL'],
      targetCampuses: targetCampuses || ['ALL'],
      targetYears: ['ALL'],
      author: req.user._id,
      authorRole: req.user.role,
      status: 'PUBLISHED',
      publishDate: new Date(),
      approvalChain: [
        { role: 'HOD', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
        { role: 'DEAN', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
        { role: 'DIRECTOR', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
      ],
    });

    const allUsers = await User.find({ isActive: true }).select('_id');
    await Notification.insertMany(allUsers.map(u => ({
      recipient: u._id,
      type: 'EMERGENCY',
      title: `🚨 EMERGENCY: ${title}`,
      message: content,
      relatedCircular: circular._id,
      priority: 'URGENT',
      isEmergency: true,
    })));

    await AuditLog.create({ user: req.user._id, action: 'BROADCAST_EMERGENCY', resourceId: circular._id, resourceType: 'Circular' });

    // Emit to all via socket
    req.app.get('io').emit('emergency', { title, content, circular: circular._id });

    res.status(201).json({ success: true, message: 'Emergency broadcast sent to all users.', circular });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
