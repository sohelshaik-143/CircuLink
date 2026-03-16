// api/validators/index.js
// All reusable request validators using express-validator

const { body, param, query, validationResult } = require('express-validator');

// ─── Shared error handler ───────────────────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Auth validators ─────────────────────────────────────────────────────────
const validateRegister = [
  body('collegeId')
    .trim().notEmpty().withMessage('College ID is required')
    .toUpperCase()
    .matches(/^[A-Z0-9]+$/).withMessage('College ID can only contain letters and numbers'),
  body('email')
    .isEmail().normalizeEmail().withMessage('Valid email address required')
    .endsWith('@rgukt.ac.in').withMessage('Must use RGUKT email (@rgukt.ac.in)'),
  body('password')
    .isLength({ min: 6, max: 50 }).withMessage('Password must be 6–50 characters'),
  body('name')
    .trim().notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('role')
    .isIn(['STUDENT', 'FACULTY', 'HOD', 'DSW', 'DEAN', 'DIRECTOR', 'SECURITY', 'ADMIN'])
    .withMessage('Invalid role'),
  body('campus')
    .isIn(['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam'])
    .withMessage('Invalid campus. Must be one of: RK Valley, Nuzvid, Basar, Srikakulam'),
  body('branch')
    .if(body('role').isIn(['STUDENT', 'FACULTY', 'HOD']))
    .notEmpty().withMessage('Branch is required for STUDENT/FACULTY/HOD')
    .isIn(['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT'])
    .withMessage('Invalid branch'),
  body('year')
    .if(body('role').equals('STUDENT'))
    .notEmpty().withMessage('Year is required for students')
    .isIn(['PUC-1', 'PUC-2', 'E1', 'E2', 'E3', 'E4'])
    .withMessage('Invalid year'),
  handleValidationErrors,
];

const validateLogin = [
  body('collegeId').trim().notEmpty().toUpperCase().withMessage('College ID required'),
  body('password').notEmpty().withMessage('Password required'),
  body('mfaToken').optional().isLength({ min: 6, max: 8 }).isNumeric().withMessage('MFA token must be 6-digit number'),
  handleValidationErrors,
];

// ─── Post validators ─────────────────────────────────────────────────────────
const validateCreatePost = [
  body('title')
    .trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 5, max: 200 }).withMessage('Title must be 5–200 characters'),
  body('content')
    .trim().notEmpty().withMessage('Content is required')
    .isLength({ min: 20, max: 5000 }).withMessage('Content must be 20–5000 characters'),
  body('type')
    .optional()
    .isIn(['INNOVATION', 'RESEARCH', 'PROJECT', 'IDEA', 'SOCIAL_SERVICE', 'ACHIEVEMENT', 'GENERAL'])
    .withMessage('Invalid post type'),
  body('topics')
    .optional().isArray().withMessage('Topics must be an array')
    .custom(topics => topics.every(t => ['AI', 'ML', 'Robotics', 'IoT', 'Research', 'Social Service',
      'Web Dev', 'Mobile Dev', 'Cybersecurity', 'Data Science', 'Blockchain', 'Cloud', 'Other'].includes(t)))
    .withMessage('Invalid topic value'),
  body('tags')
    .optional().isArray().withMessage('Tags must be an array')
    .custom(tags => tags.length <= 10).withMessage('Maximum 10 tags allowed'),
  body('visibility')
    .optional().isIn(['PUBLIC', 'BRANCH', 'CAMPUS', 'DEPARTMENT']).withMessage('Invalid visibility'),
  handleValidationErrors,
];

const validateComment = [
  body('content')
    .trim().notEmpty().withMessage('Comment content required')
    .isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1–1000 characters'),
  body('parentComment')
    .optional().isMongoId().withMessage('Invalid parent comment ID'),
  handleValidationErrors,
];

// ─── Circular validators ─────────────────────────────────────────────────────
const validateCreateCircular = [
  body('title')
    .trim().notEmpty().withMessage('Circular title is required')
    .isLength({ min: 5, max: 300 }).withMessage('Title must be 5–300 characters'),
  body('content')
    .trim().notEmpty().withMessage('Circular content is required')
    .isLength({ min: 10 }).withMessage('Content too short'),
  body('category')
    .isIn(['ACADEMIC', 'ADMINISTRATIVE', 'EXAM', 'EVENT', 'HOLIDAY', 'EMERGENCY', 'PLACEMENT', 'SPORTS', 'CULTURAL', 'OTHER'])
    .withMessage('Invalid category'),
  body('priority')
    .optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  body('targetBranches')
    .optional().isArray()
    .custom(b => b.every(x => ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT', 'ALL'].includes(x)))
    .withMessage('Invalid branch in targetBranches'),
  body('targetCampuses')
    .optional().isArray()
    .custom(c => c.every(x => ['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam', 'ALL'].includes(x)))
    .withMessage('Invalid campus in targetCampuses'),
  body('expiryDate')
    .optional().isISO8601().withMessage('Invalid expiry date format'),
  handleValidationErrors,
];

const validateApproveCircular = [
  param('id').isMongoId().withMessage('Invalid circular ID'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment too long (max 500)'),
  handleValidationErrors,
];

const validateRejectCircular = [
  param('id').isMongoId().withMessage('Invalid circular ID'),
  body('reason').trim().notEmpty().withMessage('Rejection reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be 5–500 characters'),
  handleValidationErrors,
];

const validateEmergency = [
  body('title').trim().notEmpty().withMessage('Emergency title required')
    .isLength({ min: 5, max: 200 }).withMessage('Title must be 5–200 characters'),
  body('content').trim().notEmpty().withMessage('Emergency details required')
    .isLength({ min: 10 }).withMessage('Details too short'),
  handleValidationErrors,
];

// ─── Query validators ────────────────────────────────────────────────────────
const validatePostQuery = [
  query('branch').optional().isIn(['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT', 'ALL']),
  query('campus').optional().isIn(['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam', 'ALL']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1–50'),
  query('sort').optional().isIn(['newest', 'oldest', 'trending', 'most_endorsed', 'most_viewed']),
  handleValidationErrors,
];

// ─── Param validators ────────────────────────────────────────────────────────
const validateMongoId = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateCreatePost,
  validateComment,
  validateCreateCircular,
  validateApproveCircular,
  validateRejectCircular,
  validateEmergency,
  validatePostQuery,
  validateMongoId,
};
