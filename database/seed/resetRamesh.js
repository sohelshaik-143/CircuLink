const mongoose = require('mongoose');
const User = require('../../models/User');

const MONGO_URI = 'mongodb://localhost:27017/rgukt_platform';

async function run() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const user = await User.findOne({ collegeId: 'R220379' });
    if (user) {
      user.password = 'password123';
      await user.save();
      console.log('Successfully reset password for Ramesh Kumar (R220379).');
    } else {
      console.log('User R220379 not found.');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
