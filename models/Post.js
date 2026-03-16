const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, maxlength: 5000 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Classification
  type: {
    type: String,
    enum: ['INNOVATION', 'RESEARCH', 'PROJECT', 'IDEA', 'SOCIAL_SERVICE', 'ACHIEVEMENT', 'GENERAL'],
    default: 'GENERAL',
  },
  topics: [{
    type: String,
    enum: ['AI', 'ML', 'Robotics', 'IoT', 'Research', 'Social Service', 'Web Dev',
      'Mobile Dev', 'Cybersecurity', 'Data Science', 'Blockchain', 'Cloud', 'Other'],
  }],
  tags: [{ type: String, trim: true }],

  // Scope
  branch: { type: String, enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT', 'ALL'] },
  campus: { type: String, enum: ['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam', 'ongole', 'ALL'] },
  visibility: {
    type: String,
    enum: ['PUBLIC', 'BRANCH', 'CAMPUS', 'DEPARTMENT'],
    default: 'PUBLIC',
  },

  // Media
  attachments: [{
    filename: String,
    url: String,
    type: { type: String }, // 'image', 'pdf', 'video', 'doc'
    size: Number,
  }],
  thumbnailUrl: { type: String },

  // Engagement
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  endorsements: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    createdAt: { type: Date, default: Date.now },
  }],
  shares: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],

  // Status
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'FLAGGED'],
    default: 'PUBLISHED',
  },
  isFeatured: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },

  // Versioning
  version: { type: Number, default: 1 },
  versions: [{
    version: Number,
    content: String,
    editedAt: Date,
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
}, { timestamps: true });

PostSchema.index({ title: 'text', content: 'text', tags: 'text' });
PostSchema.index({ branch: 1, campus: 1, topics: 1 });
PostSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.models.Post || mongoose.model('Post', PostSchema);
