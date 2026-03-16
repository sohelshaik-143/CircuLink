const mongoose = require('mongoose');

const CircularSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  content: { type: String, required: true },
  circularNumber: { type: String, unique: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorRole: { type: String },

  // Targeting
  targetBranches: [{ type: String, enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT', 'ALL'] }],
  targetCampuses: [{ type: String, enum: ['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam', 'ALL'] }],
  targetYears: [{ type: String, enum: ['PUC-1', 'PUC-2', 'E1', 'E2', 'E3', 'E4', 'ALL'] }],
  targetRoles: [{ type: String }],

  // Classification
  category: {
    type: String,
    enum: ['ACADEMIC', 'ADMINISTRATIVE', 'EXAM', 'EVENT', 'HOLIDAY', 'EMERGENCY', 'PLACEMENT', 'SPORTS', 'CULTURAL', 'OTHER'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM',
  },

  // Attachments
  attachments: [{
    filename: String,
    url: String,
    type: String,
    size: Number,
  }],

  // Approval Workflow: FACULTY/HOD creates → HOD approves → Dean approves → Director approves
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_HOD', 'PENDING_DEAN', 'PENDING_DIRECTOR', 'APPROVED', 'REJECTED', 'PUBLISHED'],
    default: 'DRAFT',
  },
  approvalChain: [{
    role: { type: String, enum: ['HOD', 'DSW', 'DEAN', 'DIRECTOR'] },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    comment: String,
    actionAt: Date,
  }],
  rejectionReason: { type: String },

  // Read tracking
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now },
  }],
  acknowledgedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date, default: Date.now },
  }],

  // Dates
  publishDate: { type: Date },
  expiryDate: { type: Date },
  isActive: { type: Boolean, default: true },

  // Versioning
  version: { type: Number, default: 1 },
  versions: [{
    version: Number,
    content: String,
    editedAt: Date,
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
}, { timestamps: true });

// Auto-generate circular number
CircularSchema.pre('save', async function (next) {
  if (!this.circularNumber) {
    const count = await mongoose.model('Circular').countDocuments();
    const year = new Date().getFullYear();
    this.circularNumber = `RGUKT/${year}/${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

CircularSchema.index({ status: 1, targetBranches: 1, targetCampuses: 1 });
CircularSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Circular', CircularSchema);
