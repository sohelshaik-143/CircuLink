const mongoose = require('mongoose');
const User = require('../../models/User');

const MONGO_URI = 'mongodb+srv://shaikimambasha968_db_user:Shaiksohel%40%23%24143@cluster0.1rydjdb.mongodb.net/rgukt_platform?retryWrites=true&w=majority';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const users = await User.find({ email: 'r220379@rguktrkv.ac.in' });
    console.log('Users found:', JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
