const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');

const MONGO_URI = 'mongodb://localhost:27017/rgukt_platform';

const testUsers = [
  {
    name: 'Ramesh Kumar',
    collegeId: 'R220379',
    email: 'r220379@rguktrkv.ac.in',
    password: 'password123',
    role: 'STUDENT',
    branch: 'CSE',
    campus: 'RK Valley',
    year: 'E1',
    isVerified: true,
  },
  {
    name: 'Dr. K. Srinivasa Rao',
    collegeId: 'DIR_RKV',
    email: 'director@rguktrkv.ac.in',
    password: 'password123',
    role: 'DIRECTOR',
    campus: 'RK Valley',
    isVerified: true,
  },
  {
    name: 'Dr. M. Chandra Sekhar',
    collegeId: 'DEAN_RKV',
    email: 'dean@rguktrkv.ac.in',
    password: 'password123',
    role: 'DEAN',
    campus: 'RK Valley',
    isVerified: true,
  },
  {
    name: 'Dr. P. Venkateswarlu',
    collegeId: 'DSW_RKV',
    email: 'dsw@rguktrkv.ac.in',
    password: 'password123',
    role: 'DSW',
    campus: 'RK Valley',
    isVerified: true,
  },
  {
    name: 'Security Chief',
    collegeId: 'SEC_RKV',
    email: 'security@rguktrkv.ac.in',
    password: 'password123',
    role: 'SECURITY',
    campus: 'RK Valley',
    isVerified: true,
  }
];

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB.');

    for (const u of testUsers) {
      const exists = await User.findOne({ collegeId: u.collegeId });
      if (exists) {
        console.log(`User ${u.name} (${u.collegeId}) already exists. Skipping.`);
      } else {
        await User.create(u);
        console.log(`Created user: ${u.name} (${u.role})`);
      }
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seed();
