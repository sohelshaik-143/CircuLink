const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://shaikimambasha968_db_user:Shaiksohel%40%23%24143@cluster0.1rydjdb.mongodb.net/rgukt_platform?retryWrites=true&w=majority';

console.log('Testing connection to MongoDB Atlas...');
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('✅ Connection Successful!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection Failed:', err.message);
    process.exit(1);
  });
