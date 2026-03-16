// api/routes/circularRoutes.js
// All Circular management + approval workflow endpoints

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../../middleware/auth');
const { authorize, minRole } = require('../../middleware/rbac');
const Circular = require('../../models/Circular');
const { Notification, AuditLog } = require('../../models/Other');
const User = require('../../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/circulars';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `circular-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
  next();
};

// ─── GET /api/circulars ──────────────────────────────────────────────────────
/**
 * @desc    Get circulars (role-based visibility)
 * @query   branch, campus, category, priority, status, search, page, limit
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { branch, campus, category, priority, status, search, page = 1, limit = 10 } = req.query;
    const query = {};

    // Role-based visibility
    const role = req.user.role;
    if (role === 'STUDENT') {
      query.status = 'PUBLISHED';
      query.isActive = true;
      query.$or = [
        { targetBranches: 'ALL' },
        { targetBranches: { $in: [req.user.branch] } },
      ];
    } else if (role === 'FACULTY') {
      query.status = { $in: ['PUBLISHED', 'PENDING_HOD'] };
    } else if (role === 'HOD') {
      query.$or = [
        { status: 'PUBLISHED' },
        { status: 'PENDING_HOD', targetBranches: { $in: ['ALL', req.user.branch] } },
      ];
    } else if (role === 'DSW') {
      query.$or = [{ status: 'PUBLISHED' }, { status: 'PENDING_DEAN' }];
    } else if (role === 'DEAN') {
      query.$or = [{ status: 'PUBLISHED' }, { status: 'PENDING_DEAN' }, { status: 'PENDING_HOD' }];
    } else {
      // DIRECTOR, ADMIN, SECURITY — see all
      if (status) query.status = status;
    }

    // Additional filters
    if (branch && branch !== 'ALL') query.targetBranches = { $in: [branch, 'ALL'] };
    if (campus && campus !== 'ALL') query.targetCampuses = { $in: [campus, 'ALL'] };
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) query.$text = { $search: search };

    const [circulars, total] = await Promise.all([
      Circular.find(query)
        .populate('author', 'name collegeId role branch campus')
        .populate('approvalChain.approvedBy', 'name role')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .select('-versions'),
      Circular.countDocuments(query),
    ]);

    // Add isRead flag
    const result = circulars.map(c => {
      const obj = c.toObject();
      obj.isRead = c.readBy?.some(r => r.user.toString() === req.user._id.toString()) || false;
      obj.isAcknowledged = c.acknowledgedBy?.some(a => a.user.toString() === req.user._id.toString()) || false;
      delete obj.readBy; // Don't send full array
      return obj;
    });

    // Count unread
    const unreadCount = result.filter(c => !c.isRead).length;

    res.json({ success: true, count: circulars.length, total, pages: Math.ceil(total / limit), unreadCount, circulars: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/circulars ─────────────────────────────────────────────────────
/**
 * @desc    Create a new circular (starts approval workflow)
 * @access  Private — FACULTY, HOD, DSW, DEAN, DIRECTOR, ADMIN
 */
router.post('/', protect, minRole('FACULTY'), upload.array('attachments', 5), [
  body('title').trim().notEmpty().isLength({ max: 300 }).withMessage('Title required'),
  body('content').trim().notEmpty().withMessage('Content required'),
  body('category').isIn(['ACADEMIC', 'ADMINISTRATIVE', 'EXAM', 'EVENT', 'HOLIDAY', 'EMERGENCY', 'PLACEMENT', 'SPORTS', 'CULTURAL', 'OTHER'])
    .withMessage('Invalid category'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
], validate, async (req, res) => {
  try {
    const { title, content, category, priority, targetBranches, targetCampuses, targetYears, expiryDate, requiresAcknowledgment } = req.body;
    
    // Parse JSON strings if from FormData
    const branches = typeof targetBranches === 'string' ? JSON.parse(targetBranches) : targetBranches;
    const campuses = typeof targetCampuses === 'string' ? JSON.parse(targetCampuses) : targetCampuses;
    const years = typeof targetYears === 'string' ? JSON.parse(targetYears) : targetYears;

    const attachments = (req.files || []).map(f => ({
      filename: f.originalname,
      url: `/uploads/circulars/${f.filename}`,
      type: f.mimetype.startsWith('image') ? 'image' : 'doc',
      size: f.size
    }));

    const role = req.user.role;

    // Determine initial status based on creator's role
    let initialStatus;
    const approvalChain = [];

    if (role === 'FACULTY') {
      initialStatus = 'PENDING_HOD';
      approvalChain.push(
        { role: 'HOD', status: 'PENDING' },
        { role: 'DEAN', status: 'PENDING' },
        { role: 'DIRECTOR', status: 'PENDING' },
      );
    } else if (role === 'HOD') {
      initialStatus = 'PENDING_DEAN';
      approvalChain.push(
        { role: 'HOD', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date(), comment: 'Created by HOD' },
        { role: 'DEAN', status: 'PENDING' },
        { role: 'DIRECTOR', status: 'PENDING' },
      );
    } else if (['DSW'].includes(role)) {
      initialStatus = 'PENDING_DEAN';
      approvalChain.push(
        { role: 'HOD', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
        { role: 'DEAN', status: 'PENDING' },
        { role: 'DIRECTOR', status: 'PENDING' },
      );
    } else if (role === 'DEAN') {
      initialStatus = 'PENDING_DIRECTOR';
      approvalChain.push(
        { role: 'HOD', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
        { role: 'DEAN', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
        { role: 'DIRECTOR', status: 'PENDING' },
      );
    } else {
      // DIRECTOR, ADMIN — auto-publish
      initialStatus = 'PUBLISHED';
      approvalChain.push(
        { role: 'HOD', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
        { role: 'DEAN', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
        { role: 'DIRECTOR', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
      );
    }

    const circular = await Circular.create({
      title, content, category, priority: priority || 'MEDIUM',
      targetBranches: targetBranches || ['ALL'],
      targetCampuses: targetCampuses || ['ALL'],
      targetYears: targetYears || ['ALL'],
      author: req.user._id, authorRole: role,
      approvalChain, status: initialStatus,
      expiryDate: expiryDate || null,
      requiresAcknowledgment: requiresAcknowledgment || false,
      publishDate: initialStatus === 'PUBLISHED' ? new Date() : null,
      attachments
    });

    // Notify next approver
    const notifyMap = { PENDING_HOD: 'HOD', PENDING_DEAN: 'DEAN', PENDING_DIRECTOR: 'DIRECTOR' };
    const nextRole = notifyMap[initialStatus];
    if (nextRole) {
      const approvers = await User.find({ role: nextRole }).select('_id');
      if (approvers.length) {
        await Notification.insertMany(approvers.map(u => ({
          recipient: u._id, sender: req.user._id, type: 'APPROVAL_REQUIRED',
          title: '📋 Circular Awaiting Your Approval',
          message: `"${title}" (${category}) from ${req.user.name} needs your approval.`,
          relatedCircular: circular._id, priority: 'HIGH',
        })));
      }
    }

    // If directly published, notify all target users
    if (initialStatus === 'PUBLISHED') {
      const userQuery = {};
      if (!circular.targetBranches.includes('ALL')) userQuery.branch = { $in: circular.targetBranches };
      if (!circular.targetCampuses.includes('ALL')) userQuery.campus = { $in: circular.targetCampuses };
      const targets = await User.find(userQuery).select('_id').limit(500);
      if (targets.length) {
        await Notification.insertMany(targets.map(u => ({
          recipient: u._id, type: 'NEW_CIRCULAR',
          title: `📋 New Circular: ${title}`,
          message: `${category} circular from ${req.user.name}`,
          relatedCircular: circular._id, priority: priority || 'MEDIUM',
        })));
      }
    }

    await AuditLog.create({ user: req.user._id, action: 'CREATE_CIRCULAR', resourceId: circular._id, resourceType: 'Circular', campus: req.user.campus, branch: req.user.branch });

    res.status(201).json({ success: true, circular, message: `Circular ${initialStatus === 'PUBLISHED' ? 'published' : 'submitted for approval'}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/circulars/pending ──────────────────────────────────────────────
/**
 * @desc    Get all circulars pending current user's approval
 * @access  Private — HOD, DSW, DEAN, DIRECTOR
 */
router.get('/pending', protect, minRole('HOD'), async (req, res) => {
  try {
    const roleStatusMap = {
      HOD: 'PENDING_HOD',
      DSW: 'PENDING_DEAN',
      DEAN: 'PENDING_DEAN',
      DIRECTOR: 'PENDING_DIRECTOR',
    };
    const pendingStatus = roleStatusMap[req.user.role];
    if (!pendingStatus) return res.json({ success: true, circulars: [] });

    const query = { status: pendingStatus };
    if (req.user.role === 'HOD') {
      query.$or = [{ targetBranches: 'ALL' }, { targetBranches: req.user.branch }];
    }

    const circulars = await Circular.find(query)
      .populate('author', 'name role branch campus')
      .sort('-createdAt');

    res.json({ success: true, count: circulars.length, circulars });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── PUT /api/circulars/:id/approve ─────────────────────────────────────────
/**
 * @desc    Approve a circular (advances workflow)
 * @access  Private — HOD, DSW, DEAN, DIRECTOR
 */
router.put('/:id/approve', protect, minRole('HOD'), [
  body('comment').optional().isLength({ max: 500 }),
], validate, async (req, res) => {
  try {
    const { comment } = req.body;
    const circular = await Circular.findById(req.params.id);
    if (!circular) return res.status(404).json({ success: false, message: 'Circular not found.' });

    const roleStepMap = { HOD: 0, DSW: 1, DEAN: 1, DIRECTOR: 2 };
    const step = roleStepMap[req.user.role];
    if (step === undefined) return res.status(403).json({ success: false, message: 'Not authorized to approve.' });

    const currentStep = circular.approvalChain[step];
    if (!currentStep || currentStep.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'This approval step is not pending or already actioned.' });
    }

    currentStep.status = 'APPROVED';
    currentStep.approvedBy = req.user._id;
    currentStep.comment = comment || '';
    currentStep.actionAt = new Date();

    // Advance workflow
    const nextStatus = { 0: 'PENDING_DEAN', 1: 'PENDING_DIRECTOR', 2: 'PUBLISHED' };
    circular.status = nextStatus[step];
    if (circular.status === 'PUBLISHED') {
      circular.publishDate = new Date();
      circular.isActive = true;
    }

    await circular.save();

    // Notifications
    if (circular.status === 'PUBLISHED') {
      // Notify author
      await Notification.create({
        recipient: circular.author, sender: req.user._id, type: 'CIRCULAR_APPROVED',
        title: '✅ Your circular is now published!',
        message: `"${circular.title}" has been approved by all parties and published.`,
        relatedCircular: circular._id, priority: 'HIGH',
      });

      // Notify target users
      const userQuery = {};
      if (!circular.targetBranches.includes('ALL')) userQuery.branch = { $in: circular.targetBranches };
      if (!circular.targetCampuses.includes('ALL')) userQuery.campus = { $in: circular.targetCampuses };
      const targets = await User.find(userQuery).select('_id').limit(500);
      if (targets.length) {
        await Notification.insertMany(targets.map(u => ({
          recipient: u._id, type: 'NEW_CIRCULAR',
          title: `📋 ${circular.title}`,
          message: `New ${circular.category} circular published.`,
          relatedCircular: circular._id, priority: circular.priority,
        })));
      }

      // Real-time socket emit
      req.app.get('io')?.to(`campus:${circular.targetCampuses[0]}`).emit('new_circular', {
        _id: circular._id, title: circular.title, category: circular.category,
      });

    } else {
      // Notify next approver
      const nextRoleMap = { PENDING_DEAN: 'DEAN', PENDING_DIRECTOR: 'DIRECTOR' };
      const nextRole = nextRoleMap[circular.status];
      if (nextRole) {
        const nextApprovers = await User.find({ role: nextRole }).select('_id');
        await Notification.insertMany(nextApprovers.map(u => ({
          recipient: u._id, sender: req.user._id, type: 'APPROVAL_REQUIRED',
          title: `📋 Circular Awaiting Your Approval`,
          message: `"${circular.title}" has been approved by ${req.user.role} and now needs your review.`,
          relatedCircular: circular._id, priority: 'HIGH',
        })));
      }
    }

    await AuditLog.create({
      user: req.user._id, action: 'APPROVE_CIRCULAR',
      resourceId: circular._id, resourceType: 'Circular',
      details: { step, comment, newStatus: circular.status },
    });

    res.json({ success: true, message: `Circular ${circular.status === 'PUBLISHED' ? 'published!' : 'advanced to next approval.'}`, circular });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── PUT /api/circulars/:id/reject ───────────────────────────────────────────
router.put('/:id/reject', protect, minRole('HOD'), [
  body('reason').trim().notEmpty().isLength({ max: 500 }).withMessage('Rejection reason required'),
], validate, async (req, res) => {
  try {
    const { reason } = req.body;
    const circular = await Circular.findById(req.params.id);
    if (!circular) return res.status(404).json({ success: false, message: 'Circular not found.' });

    const step = { HOD: 0, DSW: 1, DEAN: 1, DIRECTOR: 2 }[req.user.role];
    if (step !== undefined && circular.approvalChain[step]) {
      circular.approvalChain[step].status = 'REJECTED';
      circular.approvalChain[step].approvedBy = req.user._id;
      circular.approvalChain[step].comment = reason;
      circular.approvalChain[step].actionAt = new Date();
    }
    circular.status = 'REJECTED';
    circular.rejectionReason = reason;
    circular.rejectedBy = req.user._id;
    await circular.save();

    await Notification.create({
      recipient: circular.author, sender: req.user._id, type: 'CIRCULAR_REJECTED',
      title: '❌ Your circular was rejected',
      message: `"${circular.title}" was rejected by ${req.user.name} (${req.user.role}). Reason: ${reason}`,
      relatedCircular: circular._id, priority: 'HIGH',
    });

    await AuditLog.create({ user: req.user._id, action: 'REJECT_CIRCULAR', resourceId: circular._id, resourceType: 'Circular', details: { reason } });
    res.json({ success: true, message: 'Circular rejected.', circular });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/circulars/:id/read ────────────────────────────────────────────
router.post('/:id/read', protect, async (req, res) => {
  try {
    await Circular.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: { user: req.user._id, readAt: new Date() } },
      $inc: { readCount: 1 },
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/circulars/:id/acknowledge ─────────────────────────────────────
router.post('/:id/acknowledge', protect, async (req, res) => {
  try {
    await Circular.findByIdAndUpdate(req.params.id, {
      $addToSet: { acknowledgedBy: { user: req.user._id, acknowledgedAt: new Date() } },
    });
    res.json({ success: true, message: 'Acknowledged.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/circulars/emergency ──────────────────────────────────────────
/**
 * @desc    Broadcast emergency circular to all users instantly
 * @access  Private — SECURITY, DEAN, DIRECTOR, ADMIN
 */
router.post('/emergency', protect, authorize('SECURITY', 'DEAN', 'DIRECTOR', 'ADMIN'), [
  body('title').trim().notEmpty().withMessage('Emergency title required'),
  body('content').trim().notEmpty().withMessage('Emergency details required'),
], validate, async (req, res) => {
  try {
    const { title, content, targetCampuses } = req.body;
    const circular = await Circular.create({
      title, content,
      category: 'EMERGENCY', priority: 'URGENT', isEmergency: true,
      targetBranches: ['ALL'],
      targetCampuses: targetCampuses || ['ALL'],
      targetYears: ['ALL'],
      author: req.user._id, authorRole: req.user.role,
      status: 'PUBLISHED', publishDate: new Date(), isActive: true,
      requiresAcknowledgment: true,
      approvalChain: [
        { role: 'HOD', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
        { role: 'DEAN', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
        { role: 'DIRECTOR', status: 'APPROVED', approvedBy: req.user._id, actionAt: new Date() },
      ],
    });

    const allUsers = await User.find({ isActive: true }).select('_id');
    const notifications = allUsers.map(u => ({
      recipient: u._id,
      type: 'EMERGENCY',
      title: `🚨 EMERGENCY: ${title}`,
      message: content,
      relatedCircular: circular._id,
      priority: 'URGENT',
      isEmergency: true,
    }));

    // Batch insert
    for (let i = 0; i < notifications.length; i += 500) {
      await Notification.insertMany(notifications.slice(i, i + 500));
    }

    await AuditLog.create({
      user: req.user._id, action: 'BROADCAST_EMERGENCY',
      resourceId: circular._id, resourceType: 'Circular',
      details: { affectedUsers: allUsers.length, targetCampuses },
    });

    // Socket broadcast
    req.app.get('io')?.emit('emergency', {
      _id: circular._id, title, content,
      broadcastBy: req.user.name, broadcastAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: `🚨 Emergency broadcast sent to ${allUsers.length} users across all campuses.`,
      circular,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── GET /api/circulars/:id ──────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const circular = await Circular.findById(req.params.id)
      .populate('author', 'name collegeId role branch campus')
      .populate('approvalChain.approvedBy', 'name role')
      .populate('rejectedBy', 'name role');

    if (!circular) return res.status(404).json({ success: false, message: 'Circular not found.' });

    const obj = circular.toObject();
    
    // Safety checks for readBy and acknowledgedBy arrays
    obj.isRead = circular.readBy?.some(r => r.user?.toString() === req.user._id.toString()) || false;
    obj.isAcknowledged = circular.acknowledgedBy?.some(a => a.user?.toString() === req.user._id.toString()) || false;
    obj.readCount = circular.readBy?.length || 0;
    obj.acknowledgedCount = circular.acknowledgedBy?.length || 0;

    // Auto mark as read
    await Circular.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: { user: req.user._id, readAt: new Date() } },
    });

    res.json({ success: true, circular: obj });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
});

// ─── DELETE /api/circulars/:id ───────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const circular = await Circular.findById(req.params.id);
    if (!circular) return res.status(404).json({ success: false, message: 'Not found.' });

    // Allow author OR HOD+ roles
    const isAuthor = circular.author.toString() === req.user._id.toString();
    const isOfficial = ['HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN'].includes(req.user.role);

    if (!isAuthor && !isOfficial) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete.' });
    }

    circular.isArchived = true;
    circular.archivedAt = new Date();
    circular.archivedBy = req.user._id;
    await circular.save();

    await AuditLog.create({ user: req.user._id, action: 'DELETE_CIRCULAR', resourceId: req.params.id, resourceType: 'Circular' });
    res.json({ success: true, message: 'Circular deleted and archived.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
