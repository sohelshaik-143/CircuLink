// database/migrations/001_add_gamification.js
// Migration: Add gamification fields to existing users

require('dotenv').config();
const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rgukt_platform';

const up = async () => {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const users = db.collection('users');

  // Add missing gamification fields to all users that don't have them
  const result = await users.updateMany(
    { points: { $exists: false } },
    {
      $set: {
        points: 0, badges: [], level: 'Beginner',
        streak: 0, followersCount: 0, followingCount: 0,
        isOnline: false, loginCount: 0,
        notificationPrefs: { email: true, inApp: true, circulars: true, posts: true, emergency: true },
        language: 'en', theme: 'light',
      },
    }
  );
  console.log(`✅ Migration 001: Updated ${result.modifiedCount} users with gamification fields`);
  await mongoose.disconnect();
};

const down = async () => {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  await db.collection('users').updateMany({}, {
    $unset: { points: '', badges: '', level: '', streak: '', notificationPrefs: '' },
  });
  console.log('✅ Migration 001 rolled back');
  await mongoose.disconnect();
};

if (require.main === module) {
  const direction = process.argv[2] || 'up';
  (direction === 'up' ? up() : down()).catch(err => { console.error(err); process.exit(1); });
}
module.exports = { up, down };
