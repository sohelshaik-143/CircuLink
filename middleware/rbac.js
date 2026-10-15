// Role-Based Access Control Middleware

// Allow only specified roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};

// Allow only users from same branch (or HOD/Dean/Director/Admin)
exports.sameBranchOrHigher = (req, res, next) => {
  const higherRoles = ['HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN'];
  if (higherRoles.includes(req.user.role)) return next();

  const resourceBranch = req.params.branch || req.body.branch;
  if (resourceBranch && resourceBranch !== 'ALL' && resourceBranch !== req.user.branch) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted to your branch.',
    });
  }
  next();
};

// Allow only users from same campus (or Dean/Director/Admin)
exports.sameCampusOrHigher = (req, res, next) => {
  const higherRoles = ['DEAN', 'DIRECTOR', 'ADMIN'];
  if (higherRoles.includes(req.user.role)) return next();

  const resourceCampus = req.params.campus || req.body.campus;
  if (resourceCampus && resourceCampus !== 'ALL' && resourceCampus !== req.user.campus) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted to your campus.',
    });
  }
  next();
};

// Resource ownership check (user owns the resource or is admin)
exports.ownerOrAdmin = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      const ownerId = await getOwnerId(req);
      if (!ownerId) return res.status(404).json({ success: false, message: 'Resource not found.' });

      const userKey = (req.user._id || req.user.id || '').toString();
      const isOwner = ownerId.toString() === userKey;
      const isAdmin = req.user.role === 'ADMIN';
      const isHigher = ['DEAN', 'DIRECTOR'].includes(req.user.role);

      if (!isOwner && !isAdmin && !isHigher) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this resource.' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

// Role hierarchy levels
const ROLE_LEVELS = {
  STUDENT: 1,
  FACULTY: 2,
  SECURITY: 2,
  HOD: 3,
  DSW: 3,
  DEAN: 4,
  DIRECTOR: 5,
  ADMIN: 6,
};

exports.minRole = (minRoleName) => {
  return (req, res, next) => {
    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    const requiredLevel = ROLE_LEVELS[minRoleName] || 0;
    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `Requires at least ${minRoleName} level access.`,
      });
    }
    next();
  };
};
