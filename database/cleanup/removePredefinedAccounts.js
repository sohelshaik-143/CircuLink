// database/cleanup/removePredefinedAccounts.js
// Run with: node database/cleanup/removePredefinedAccounts.js
// Removes all users that were seeded/predefined (non-real college accounts)

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function cleanupPredefinedAccounts() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const User = require('../../models/User');

  // Real RGUKT college email domains
  const validDomains = ['rguktrkv.ac.in', 'rguktrong.ac.in', 'rguktskl.ac.in', 'rguktnuz.ac.in'];

  // Find accounts that don't belong to valid RGUKT domains
  const predefinedUsers = await User.find({
    email: {
      $not: new RegExp(`@(${validDomains.join('|')})$`, 'i')
    }
  }).select('name email collegeId role');

  if (predefinedUsers.length === 0) {
    console.log('No predefined accounts found. Database is clean.');
    await mongoose.disconnect();
    return;
  }

  console.log(`\nFound ${predefinedUsers.length} predefined/non-RGUKT accounts:`);
  predefinedUsers.forEach(u => {
    console.log(`  - ${u.name} | ${u.email} | ${u.collegeId} | ${u.role}`);
  });

  const ids = predefinedUsers.map(u => u._id);
  const result = await User.deleteMany({ _id: { $in: ids } });

  console.log(`\n✅ Deleted ${result.deletedCount} predefined accounts.`);
  console.log('Only real RGUKT college accounts remain.');

  await mongoose.disconnect();
}

cleanupPredefinedAccounts().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
