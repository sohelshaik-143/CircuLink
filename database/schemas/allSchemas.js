// ═══════════════════════════════════════════════════════════════════
//  RGUKT RK VALLEY PLATFORM — COMPLETE DATABASE SCHEMA REFERENCE
//  MongoDB Collections: 6 main + 2 system
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// COLLECTION 1: users
// ─────────────────────────────────────────────────────────────────
const UserSchema = {
  // Identity
  _id: ObjectId,
  collegeId: String,        // "S22CS001", "F001CSE", "H001CSE"
  email: String,            // "arjun@rgukt.ac.in"
  password: String,         // bcrypt hashed
  name: String,             // "Arjun Reddy"

  // Role & Academic Info
  role: String,             // STUDENT | FACULTY | HOD | DSW | DEAN | DIRECTOR | SECURITY | ADMIN
  branch: String,           // CSE | ECE | EEE | MECH | CIVIL | CHEM | MMT
  campus: String,           // RK Valley | Nuzvid | Basar | Srikakulam | ongole
  year: String,             // PUC-1 | PUC-2 | E1 | E2 | E3 | E4 (STUDENT only)
  section: String,          // "A", "B", "C"
  department: String,       // For faculty: "Computer Science"
  designation: String,      // "Associate Professor", "Professor"

  // Profile
  profilePicture: String,   // URL or base64
  bio: String,              // max 300 chars
  phone: String,
  address: String,

  // Gamification
  points: Number,           // default: 0
  badges: [String],         // ["Innovator", "Top Contributor", "Research Star"]
  level: String,            // Beginner | Intermediate | Advanced | Expert
  streak: Number,           // consecutive active days
  lastActiveDate: Date,

  // MFA (HOD, Dean, Director, Admin)
  mfaEnabled: Boolean,
  mfaSecret: String,        // speakeasy base32 secret (select: false)
  mfaBackupCodes: [String], // one-time backup codes

  // Social
  following: [ObjectId],    // ref: User
  followers: [ObjectId],    // ref: User
  followersCount: Number,
  followingCount: Number,
  subscribedBranches: [String],
  subscribedTopics: [String],
  blockedUsers: [ObjectId],

  // Notifications preferences
  notificationPrefs: {
    email: Boolean,
    inApp: Boolean,
    circulars: Boolean,
    posts: Boolean,
    emergency: Boolean,
  },

  // Auth tokens
  refreshToken: String,     // (select: false)
  passwordResetToken: String,
  passwordResetExpiry: Date,
  emailVerifyToken: String,
  isVerified: Boolean,

  // Status
  isActive: Boolean,
  isOnline: Boolean,
  lastLogin: Date,
  lastSeen: Date,
  loginCount: Number,
  language: String,         // "en" | "te"
  theme: String,            // "light" | "dark"

  // Timestamps
  createdAt: Date,
  updatedAt: Date,
};

// Indexes on users:
// { collegeId: 1 } unique
// { email: 1 } unique
// { role: 1, campus: 1, branch: 1 }
// { points: -1 } for leaderboard

// ─────────────────────────────────────────────────────────────────
// COLLECTION 2: posts
// ─────────────────────────────────────────────────────────────────
const PostSchema = {
  _id: ObjectId,
  title: String,            // max 200 chars
  content: String,          // max 5000 chars (rich text markdown)
  author: ObjectId,         // ref: User

  // Classification
  type: String,             // INNOVATION | RESEARCH | PROJECT | IDEA | SOCIAL_SERVICE | ACHIEVEMENT | GENERAL
  topics: [String],         // AI | ML | Robotics | IoT | Research | Social Service | ...
  tags: [String],           // free text tags
  language: String,         // "en" | "te"

  // Targeting
  branch: String,           // CSE | ... | ALL
  campus: String,           // RK Valley | ... | ALL
  visibility: String,       // PUBLIC | BRANCH | CAMPUS | DEPARTMENT

  // Media
  attachments: [{
    _id: ObjectId,
    filename: String,       // "project_report.pdf"
    originalName: String,
    url: String,            // "/uploads/posts/..."
    type: String,           // "image" | "pdf" | "video" | "doc"
    size: Number,           // bytes
    mimeType: String,
    uploadedAt: Date,
  }],
  thumbnailUrl: String,
  videoUrl: String,         // YouTube/Drive embed

  // Engagement
  likes: [ObjectId],        // ref: User
  likesCount: Number,       // denormalized for perf
  comments: [ObjectId],     // ref: Comment
  commentsCount: Number,
  shares: Number,
  views: Number,
  bookmarks: [ObjectId],    // ref: User

  // Endorsements (by Faculty/HOD/Dean/Director)
  endorsements: [{
    _id: ObjectId,
    user: ObjectId,         // ref: User
    message: String,
    role: String,           // role at time of endorsement
    createdAt: Date,
  }],
  endorsementsCount: Number,

  // Status
  status: String,           // DRAFT | PUBLISHED | ARCHIVED | FLAGGED
  isFeatured: Boolean,
  isPinned: Boolean,
  isAnonymous: Boolean,
  flaggedReason: String,
  flaggedBy: ObjectId,

  // Versioning
  version: Number,
  versions: [{
    version: Number,
    title: String,
    content: String,
    editedAt: Date,
    editedBy: ObjectId,
  }],

  // SEO / search
  slug: String,             // "ai-powered-irrigation-system-2024"

  createdAt: Date,
  updatedAt: Date,
};

// Indexes on posts:
// { title: 'text', content: 'text', tags: 'text' } text search
// { branch: 1, campus: 1, topics: 1 }
// { author: 1, createdAt: -1 }
// { status: 1, isFeatured: -1, createdAt: -1 }
// { likesCount: -1 } for trending

// ─────────────────────────────────────────────────────────────────
// COLLECTION 3: circulars
// ─────────────────────────────────────────────────────────────────
const CircularSchema = {
  _id: ObjectId,
  title: String,            // max 300 chars
  content: String,          // rich text / HTML
  circularNumber: String,   // "RGUKT/2024/0001" — auto-generated
  author: ObjectId,         // ref: User
  authorRole: String,       // role at time of creation

  // Targeting
  targetBranches: [String], // ["CSE", "ECE"] or ["ALL"]
  targetCampuses: [String], // ["RK Valley"] or ["ALL"]
  targetYears: [String],    // ["E3", "E4"] or ["ALL"]
  targetRoles: [String],    // optional role filter

  // Classification
  category: String,         // ACADEMIC | ADMINISTRATIVE | EXAM | EVENT | HOLIDAY | EMERGENCY | PLACEMENT | SPORTS | CULTURAL | OTHER
  priority: String,         // LOW | MEDIUM | HIGH | URGENT
  isEmergency: Boolean,

  // Attachments
  attachments: [{
    filename: String,
    url: String,
    type: String,
    size: Number,
  }],

  // 3-Step Approval Workflow
  status: String,           // DRAFT | PENDING_HOD | PENDING_DEAN | PENDING_DIRECTOR | APPROVED | REJECTED | PUBLISHED
  approvalChain: [{
    role: String,           // HOD | DSW | DEAN | DIRECTOR
    approvedBy: ObjectId,   // ref: User
    status: String,         // PENDING | APPROVED | REJECTED
    comment: String,
    actionAt: Date,
  }],
  rejectionReason: String,
  rejectedBy: ObjectId,

  // Read Tracking
  readBy: [{
    user: ObjectId,
    readAt: Date,
  }],
  readCount: Number,

  // Acknowledgment (for URGENT/EMERGENCY)
  acknowledgedBy: [{
    user: ObjectId,
    acknowledgedAt: Date,
  }],
  requiresAcknowledgment: Boolean,
  acknowledgmentDeadline: Date,

  // Dates
  publishDate: Date,
  expiryDate: Date,
  isActive: Boolean,
  isArchived: Boolean,
  archivedAt: Date,
  archivedBy: ObjectId,

  // Versioning
  version: Number,
  versions: [{
    version: Number,
    content: String,
    editedAt: Date,
    editedBy: ObjectId,
  }],

  createdAt: Date,
  updatedAt: Date,
};

// Indexes on circulars:
// { circularNumber: 1 } unique
// { status: 1, targetBranches: 1, targetCampuses: 1 }
// { category: 1, priority: 1, createdAt: -1 }
// { title: 'text', content: 'text' } text search
// { publishDate: -1 }

// ─────────────────────────────────────────────────────────────────
// COLLECTION 4: comments
// ─────────────────────────────────────────────────────────────────
const CommentSchema = {
  _id: ObjectId,
  content: String,          // max 1000 chars
  author: ObjectId,         // ref: User
  post: ObjectId,           // ref: Post (nullable if on circular)
  circular: ObjectId,       // ref: Circular (nullable if on post)

  // Threading
  parentComment: ObjectId,  // ref: Comment (null = top-level)
  replies: [ObjectId],      // ref: Comment
  depth: Number,            // 0 = top-level, 1 = reply, max 3

  // Engagement
  likes: [ObjectId],        // ref: User
  likesCount: Number,

  // Status
  isEdited: Boolean,
  editedAt: Date,
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId,
  isFlagged: Boolean,
  flaggedReason: String,

  createdAt: Date,
  updatedAt: Date,
};

// Indexes on comments:
// { post: 1, createdAt: 1 }
// { circular: 1, createdAt: 1 }
// { author: 1 }
// { parentComment: 1 }

// ─────────────────────────────────────────────────────────────────
// COLLECTION 5: notifications
// ─────────────────────────────────────────────────────────────────
const NotificationSchema = {
  _id: ObjectId,
  recipient: ObjectId,      // ref: User
  sender: ObjectId,         // ref: User (null for system)

  // Type
  type: String,             // NEW_CIRCULAR | CIRCULAR_APPROVED | CIRCULAR_REJECTED |
                            // NEW_POST | POST_LIKED | POST_COMMENTED | POST_ENDORSED |
                            // NEW_FOLLOWER | APPROVAL_REQUIRED | EMERGENCY |
                            // BADGE_EARNED | MENTION | SYSTEM | DEADLINE_REMINDER

  // Content
  title: String,
  message: String,
  link: String,             // deep link e.g. "/posts/..."

  // References
  relatedPost: ObjectId,
  relatedCircular: ObjectId,
  relatedComment: ObjectId,

  // Status
  isRead: Boolean,
  readAt: Date,
  isDelivered: Boolean,     // socket delivery confirmed
  deliveredAt: Date,
  isEmergency: Boolean,

  // Priority
  priority: String,         // LOW | MEDIUM | HIGH | URGENT

  // Expiry
  expiresAt: Date,          // auto-delete after this date

  createdAt: Date,
};

// Indexes on notifications:
// { recipient: 1, isRead: 1, createdAt: -1 }
// { recipient: 1, type: 1 }
// { expiresAt: 1 } TTL index (auto-delete after 30 days)

// ─────────────────────────────────────────────────────────────────
// COLLECTION 6: audit_logs
// ─────────────────────────────────────────────────────────────────
const AuditLogSchema = {
  _id: ObjectId,
  user: ObjectId,           // ref: User
  action: String,           // LOGIN | LOGOUT | REGISTER |
                            // CREATE_POST | EDIT_POST | DELETE_POST |
                            // CREATE_CIRCULAR | EDIT_CIRCULAR | DELETE_CIRCULAR |
                            // APPROVE_CIRCULAR | REJECT_CIRCULAR |
                            // LIKE_POST | COMMENT | ENDORSE |
                            // FOLLOW_USER | UNFOLLOW_USER |
                            // BROADCAST_EMERGENCY | CHANGE_SETTINGS |
                            // VIEW_ANALYTICS | EXPORT_DATA | DELETE_USER | BAN_USER

  // Resource
  resourceType: String,     // User | Post | Circular | Comment | System
  resourceId: ObjectId,

  // Context
  details: Mixed,           // action-specific details
  ipAddress: String,
  userAgent: String,
  sessionId: String,

  // Denormalized for fast reporting
  userRole: String,
  campus: String,
  branch: String,

  // Result
  success: Boolean,
  errorMessage: String,

  createdAt: Date,
};

// Indexes on audit_logs:
// { user: 1, action: 1, createdAt: -1 }
// { action: 1, createdAt: -1 }
// { resourceType: 1, resourceId: 1 }
// { createdAt: -1 } TTL index (auto-delete after 90 days)

module.exports = {
  UserSchema, PostSchema, CircularSchema,
  CommentSchema, NotificationSchema, AuditLogSchema,
};
