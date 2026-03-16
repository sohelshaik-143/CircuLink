const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  collegeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function (v) {
        return /^[RNSOB]\d{6}$/i.test(v) || /^[A-Z]{2,4}\d{3,6}$/i.test(v);
      },
      message: props => `${props.value} is not a valid College ID!`
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        // Enforce college domain and subdomains (e.g. rguktrkv.ac.in, rgukt.ac.in)
        return /^[a-z0-9._%+-]+@rgukt([a-z]{3})?\.ac\.in$/i.test(v);
      },
      message: props => `Only college email accounts (@rgukt.ac.in or campus subdomains) are allowed!`
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false,
  },
  name: { type: String, required: true, trim: true },
  role: {
    type: String,
    enum: ['STUDENT', 'FACULTY', 'HOD', 'DSW', 'DEAN', 'DIRECTOR', 'SECURITY', 'ADMIN'],
    required: true,
  },
  branch: {
    type: String,
    enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT', 'GENERAL'],
    required: function () {
      return ['STUDENT', 'FACULTY', 'HOD'].includes(this.role);
    },
  },
  campus: {
    type: String,
    enum: ['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam', 'Ongole'],
    required: true,
  },
  year: {
    type: String,
    enum: ['PUC-1', 'PUC-2', 'E1', 'E2', 'E3', 'E4'],
    required: function () { return this.role === 'STUDENT'; },
  },
  section: { type: String },
  profilePicture: { type: String, default: '' },
  bio: { type: String, maxlength: 300 },
  phone: { type: String },

  // Gamification
  points: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
  badges: [{ type: String }],
  level: { type: String, default: 'Beginner' },

  // MFA
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, select: false },

  // Social
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  subscribedBranches: [{ type: String }],
  subscribedTopics: [{ type: String }],

  // Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  refreshToken: { type: String, select: false },

  // Language preference
  language: { type: String, enum: ['en', 'te'], default: 'en' },

  // Google OAuth
  googleId: { type: String, unique: true, sparse: true },
  isGoogleUser: { type: Boolean, default: false },
}, { timestamps: true });

// Hash password and auto-detect campus
UserSchema.pre('save', async function (next) {
  // Auto-detect campus from ID prefix IF not manually set and ID is new/changed
  if (this.isModified('collegeId') && !this.isModified('campus')) {
    const prefix = this.collegeId.charAt(0).toUpperCase();
    const campusMap = {
      'R': 'RK Valley',
      'N': 'Nuzvid',
      'S': 'Srikakulam',
      'O': 'Ongole',
      'B': 'Basar'
    };
    if (campusMap[prefix]) {
      this.campus = campusMap[prefix];
    }
  }

  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update points and level
UserSchema.methods.addPoints = async function (pts) {
  this.points += pts;
  if (this.points >= 1000) this.level = 'Expert';
  else if (this.points >= 500) this.level = 'Advanced';
  else if (this.points >= 200) this.level = 'Intermediate';
  else this.level = 'Beginner';
  await this.save();
};

module.exports = mongoose.model('User', UserSchema);
