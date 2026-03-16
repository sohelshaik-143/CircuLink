require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rgukt_platform';

// ──────────────────────────────────────────────────────────────────
// SEED DATA
// ──────────────────────────────────────────────────────────────────

const CAMPUSES = ['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam', 'Ongole'];
const BRANCHES = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT'];
const YEARS = ['PUC-1', 'PUC-2', 'E1', 'E2', 'E3', 'E4'];

// Hashed passwords (all hashed once at top for performance)
const hashPwd = async (pw) => bcrypt.hash(pw, 12);

let studentHash, facultyHash, hodHash, dswHash, deanHash, directorHash, securityHash, adminHash;
async function preHash() {
  studentHash = await hashPwd('student123');
  facultyHash = await hashPwd('faculty123');
  hodHash = await hashPwd('hod12345');
  dswHash = await hashPwd('dsw12345');
  deanHash = await hashPwd('dean1234');
  directorHash = await hashPwd('director1');
  securityHash = await hashPwd('security1');
  adminHash = await hashPwd('admin1234');
}

const buildUsers = async () => {
  const students = [];
  const faculty = [];
  const hods = [];

  // Students: 2 per branch per campus = 56 students
  for (const campus of CAMPUSES) {
    const campusPrefix = campus.charAt(0).toUpperCase();
    for (const branch of BRANCHES) {
      for (let i = 1; i <= 2; i++) {
        const year = YEARS[Math.floor(Math.random() * 4) + 2]; // E1-E4
        const studentId = `${campusPrefix}22${String(students.length + 1).padStart(4, '0')}`;
        students.push({
          collegeId: studentId,
          email: `student${students.length + 1}.${branch.toLowerCase()}.${campusPrefix}@rgukt.ac.in`,
          password: studentHash,
          name: getStudentName(students.length),
          role: 'STUDENT',
          branch, campus, year,
          section: ['A', 'B', 'C'][i - 1] || 'A',
          points: Math.floor(Math.random() * 300),
          level: 'Beginner',
          isActive: true, isVerified: true,
          language: 'en',
        });
      }
    }
  }

  // Faculty: 1 per branch per campus = 28 faculty
  for (const campus of CAMPUSES) {
    for (const branch of BRANCHES) {
      faculty.push({
        collegeId: `F${String(faculty.length + 1).padStart(3, '0')}${branch}`,
        email: `faculty${faculty.length + 1}.${branch.toLowerCase()}@rgukt.ac.in`,
        password: facultyHash,
        name: getFacultyName(faculty.length),
        role: 'FACULTY',
        branch, campus,
        designation: ['Assistant Professor', 'Associate Professor', 'Professor'][faculty.length % 3],
        points: Math.floor(Math.random() * 100),
        level: 'Beginner',
        isActive: true, isVerified: true,
        language: 'en',
      });
    }
  }

  // HODs: 1 per branch = 7 (all in RK Valley as main campus)
  for (const branch of BRANCHES) {
    hods.push({
      collegeId: `hod_${branch.toLowerCase()}`,
      email: `hod.${branch.toLowerCase()}@rgukt.ac.in`,
      password: hodHash,
      name: `Dr. ${getHODName(hods.length)} (HOD-${branch})`,
      role: 'HOD', branch,
      campus: 'RK Valley',
      designation: 'Professor & Head of Department',
      mfaEnabled: false,
      points: 200, level: 'Intermediate',
      isActive: true, isVerified: true,
      language: 'en',
    });
  }

  // Officials
  const officials = [
    {
      collegeId: 'DSW001',
      email: 'dsw@rgukt.ac.in',
      password: dswHash,
      name: 'Prof. Ravi Kumar DSW',
      role: 'DSW', campus: 'RK Valley',
      designation: 'Dean of Student Welfare',
      mfaEnabled: false, points: 300, level: 'Advanced',
      isActive: true, isVerified: true,
    },
    {
      collegeId: 'DEAN001',
      email: 'dean@rgukt.ac.in',
      password: deanHash,
      name: 'Dr. Nagaraju Sharma (Dean)',
      role: 'DEAN', campus: 'RK Valley',
      designation: 'Dean of Academics',
      mfaEnabled: false, points: 500, level: 'Advanced',
      isActive: true, isVerified: true,
    },
    {
      collegeId: 'DEAN002',
      email: 'dean.nuzvid@rgukt.ac.in',
      password: deanHash,
      name: 'Dr. Padma Latha (Dean-Nuzvid)',
      role: 'DEAN', campus: 'Nuzvid',
      designation: 'Dean of Academics',
      mfaEnabled: false, points: 400, level: 'Advanced',
      isActive: true, isVerified: true,
    },
    {
      collegeId: 'DIR001',
      email: 'director@rgukt.ac.in',
      password: directorHash,
      name: 'Prof. Chakravarthy Rao (Director)',
      role: 'DIRECTOR', campus: 'RK Valley',
      designation: 'Director, RGUKT RK Valley',
      mfaEnabled: false, points: 1000, level: 'Expert',
      badges: ['Platform Pioneer', 'Excellence Award'],
      isActive: true, isVerified: true,
    },
    {
      collegeId: 'SEC001',
      email: 'security@rgukt.ac.in',
      password: securityHash,
      name: 'Security Officer Prasad',
      role: 'SECURITY', campus: 'RK Valley',
      designation: 'Chief Security Officer',
      isActive: true, isVerified: true,
    },
    {
      collegeId: 'SEC002',
      email: 'security.nuzvid@rgukt.ac.in',
      password: securityHash,
      name: 'Security Officer Murali (Nuzvid)',
      role: 'SECURITY', campus: 'Nuzvid',
      isActive: true, isVerified: true,
    },
    {
      collegeId: 'ADM001',
      email: 'admin@rgukt.ac.in',
      password: adminHash,
      name: 'System Administrator',
      role: 'ADMIN', campus: 'RK Valley',
      isActive: true, isVerified: true,
      points: 999, level: 'Expert',
    },
  ];

  return [...students, ...faculty, ...hods, ...officials];
};

// ──────────────────────────────────────────────────────────────────
// POSTS SEED DATA
// ──────────────────────────────────────────────────────────────────
const buildPosts = (userMap) => [
  {
    title: 'AI-Powered Smart Irrigation System Using IoT & ML',
    content: 'We developed an intelligent irrigation system combining Arduino Mega, capacitive soil moisture sensors, DHT22 temperature/humidity sensors, and a Random Forest ML model trained on 3 months of local agricultural data. The system achieved 40% water savings in our pilot test at the college garden. Hardware cost: ₹2,400. The mobile dashboard built in Flutter gives real-time alerts.',
    author: userMap['student_CSE_0'],
    type: 'PROJECT', topics: ['AI', 'IoT', 'ML'],
    tags: ['arduino', 'random-forest', 'smart-farming', 'flutter'],
    branch: 'CSE', campus: 'RK Valley', visibility: 'PUBLIC',
    status: 'PUBLISHED', views: 847, likesCount: 42,
    isFeatured: true,
  },
  {
    title: 'Blockchain-Based Tamper-Proof Academic Certificate System',
    content: 'Built a decentralized certificate verification DApp on Ethereum Sepolia testnet. Institutions upload certificate hashes → stored in smart contract → anyone can verify via QR code without contacting the institution. Prevents fake certificates. Technologies: Solidity, React, Web3.js, IPFS for storage.',
    author: userMap['student_CSE_1'],
    type: 'RESEARCH', topics: ['Blockchain', 'Web Dev'],
    tags: ['ethereum', 'solidity', 'ipfs', 'anti-fraud'],
    branch: 'CSE', campus: 'RK Valley', visibility: 'PUBLIC',
    status: 'PUBLISHED', views: 612, likesCount: 38,
  },
  {
    title: 'Low-Cost ECG Monitor with AI Arrhythmia Detection',
    content: 'Designed a portable ECG device using AD8232 sensor + ESP32. The AI model (1D CNN trained on MIT-BIH dataset) detects 5 types of arrhythmia with 94.3% accuracy. Total hardware cost: ₹1,850. Compared to commercial devices costing ₹15,000+, this makes cardiac monitoring accessible to rural patients.',
    author: userMap['student_ECE_0'],
    type: 'INNOVATION', topics: ['AI', 'IoT'],
    tags: ['ecg', 'esp32', 'cnn', 'healthcare'],
    branch: 'ECE', campus: 'RK Valley', visibility: 'PUBLIC',
    status: 'PUBLISHED', views: 1203, likesCount: 67,
    isFeatured: true,
  },
  {
    title: 'Solar-Powered Water Purification System for Rural Villages',
    content: 'A final year CIVIL project: designed a gravity-fed, solar-powered water treatment system for a village of 500+ residents near Kadapa. Uses coagulation, sand filtration, activated carbon, and UV disinfection. Zero electricity cost. Successfully deployed in Yerraguntla village in collaboration with District Collector office.',
    author: userMap['student_CIVIL_0'],
    type: 'SOCIAL_SERVICE', topics: ['Social Service', 'Research'],
    tags: ['clean-water', 'solar', 'rural-development', 'nss'],
    branch: 'CIVIL', campus: 'RK Valley', visibility: 'PUBLIC',
    status: 'PUBLISHED', views: 934, likesCount: 88,
    isFeatured: true,
  },
  {
    title: 'Smart EV Charging Station with Load Balancing',
    content: 'EEE final year project: Designed a 3-phase EV charging station with intelligent load balancing algorithm to prevent grid overload. Uses OCPP 1.6 protocol, ESP32 controller, and a custom web dashboard for monitoring. Can handle 4 simultaneous charging sessions. Filed for patent with IIT-H mentor collaboration.',
    author: userMap['student_EEE_0'],
    type: 'PROJECT', topics: ['IoT', 'Research'],
    tags: ['ev-charging', 'load-balancing', 'patent', 'ocpp'],
    branch: 'EEE', campus: 'Nuzvid', visibility: 'PUBLIC',
    status: 'PUBLISHED', views: 445, likesCount: 29,
  },
  {
    title: 'Automated Quality Control in Manufacturing Using Computer Vision',
    content: 'Deployed a YOLOv8-based defect detection system for a local casting factory. Real-time inspection at 30 FPS on Jetson Nano. Detects 12 defect types with 97.1% precision. Reduced quality inspection time from 8 hours/day to under 30 minutes and cut rejects by 63%.',
    author: userMap['student_MECH_0'],
    type: 'RESEARCH', topics: ['AI', 'ML'],
    tags: ['yolo', 'quality-control', 'manufacturing', 'jetson-nano'],
    branch: 'MECH', campus: 'Basar', visibility: 'PUBLIC',
    status: 'PUBLISHED', views: 378, likesCount: 22,
  },
];

// ──────────────────────────────────────────────────────────────────
// CIRCULARS SEED DATA
// ──────────────────────────────────────────────────────────────────
const buildCirculars = (userMap) => {
  const hod = userMap['hod_CSE'];
  const dean = userMap['dean_RKValley'];
  const dir = userMap['director'];

  return [
    {
      title: 'Mid-Semester Examinations Schedule — November 2024',
      content: `All students are informed that Mid-Semester Examinations for Semester I/III/V will be conducted from November 18 to November 25, 2024.\n\n**Schedule:**\n- November 18: Mathematics / Engineering Physics\n- November 19: English / Environmental Studies\n- November 20: Branch-specific Subject 1\n- November 21: Branch-specific Subject 2\n- November 22: Lab Practical Examinations\n\n**Instructions:**\n1. Carry your original Hall Ticket and College ID.\n2. Exam starts at 9:00 AM sharp. No entry after 9:15 AM.\n3. Mobile phones strictly prohibited in exam hall.\n4. Results will be announced within 10 working days.`,
      circularNumber: 'RGUKT/2024/0001',
      author: hod, authorRole: 'HOD',
      targetBranches: ['ALL'], targetCampuses: ['ALL'], targetYears: ['ALL'],
      category: 'EXAM', priority: 'HIGH',
      status: 'PUBLISHED', publishDate: new Date('2024-11-01'),
      expiryDate: new Date('2024-11-30'),
      approvalChain: [
        { role: 'HOD', status: 'APPROVED', approvedBy: hod, comment: 'Approved as per academic calendar.', actionAt: new Date('2024-10-30') },
        { role: 'DEAN', status: 'APPROVED', approvedBy: dean, comment: 'Dates confirmed with all departments.', actionAt: new Date('2024-10-31') },
        { role: 'DIRECTOR', status: 'APPROVED', approvedBy: dir, comment: 'Approved.', actionAt: new Date('2024-11-01') },
      ],
      version: 1,
    },
    {
      title: 'Annual Technical Fest TECHNOVA 2024 — Registration Open',
      content: `RGUKT RK Valley proudly announces TECHNOVA 2024, our annual inter-branch technical festival.\n\n**Dates:** December 10–12, 2024\n**Venue:** Main Auditorium & Open Grounds\n\n**Events:**\n- Hackathon (24-hour): ₹50,000 prize pool\n- Paper Presentation\n- Robotics Challenge\n- Coding Competition (HackerRank)\n- Project Expo\n- Cultural Night\n\n**Registration:** technova.rgukt.ac.in (Deadline: December 5)\n**Team Size:** 2–4 members\n**Eligibility:** All RGUKT students (inter-campus allowed)\n\nFor queries: technova@rgukt.ac.in`,
      circularNumber: 'RGUKT/2024/0002',
      author: dean, authorRole: 'DEAN',
      targetBranches: ['ALL'], targetCampuses: ['ALL'], targetYears: ['ALL'],
      category: 'EVENT', priority: 'HIGH',
      status: 'PUBLISHED', publishDate: new Date('2024-11-15'),
      approvalChain: [
        { role: 'HOD', status: 'APPROVED', approvedBy: hod, actionAt: new Date('2024-11-14') },
        { role: 'DEAN', status: 'APPROVED', approvedBy: dean, actionAt: new Date('2024-11-15') },
        { role: 'DIRECTOR', status: 'APPROVED', approvedBy: dir, actionAt: new Date('2024-11-15') },
      ],
      version: 1,
    },
    {
      title: 'Campus Placement Drive — TCS & Infosys (January 2025)',
      content: `TCS and Infosys will conduct campus placement drives on January 5–6, 2025.\n\n**TCS (January 5):**\n- Package: ₹3.36 LPA (NQT) / ₹7 LPA (Digital)\n- Eligible: All branches, CGPA ≥ 7.0, E4 only\n- No active backlogs\n\n**Infosys (January 6):**\n- Package: ₹3.6 LPA (SE) / ₹8 LPA (DSE)\n- Eligible: CSE, ECE, EEE, CGPA ≥ 7.5, E4 only\n\n**Process:**\n- Aptitude Test (HirePro platform)\n- Technical Interview\n- HR Interview\n\n**Register by:** December 28, 2024 at placement.rgukt.ac.in`,
      circularNumber: 'RGUKT/2024/0003',
      author: hod, authorRole: 'HOD',
      targetBranches: ['ALL'], targetCampuses: ['RK Valley'], targetYears: ['E4'],
      category: 'PLACEMENT', priority: 'URGENT',
      status: 'PENDING_DEAN',
      approvalChain: [
        { role: 'HOD', status: 'APPROVED', approvedBy: hod, actionAt: new Date() },
        { role: 'DEAN', status: 'PENDING' },
        { role: 'DIRECTOR', status: 'PENDING' },
      ],
      version: 1,
    },
    {
      title: 'Winter Vacation Notice — December 25 to January 1',
      content: `All students and faculty are informed that the college will remain closed for Winter Vacation from December 25, 2024 to January 1, 2025.\n\nClasses will resume from January 2, 2025 (Thursday).\n\nHostel students may either stay in the hostel (mess will be operational with limited menu) or go home. Inform hostel warden at least 3 days in advance.\n\nFor emergencies during vacation, contact:\n- Security: +91-9876543210\n- DSW: +91-9876543211`,
      circularNumber: 'RGUKT/2024/0004',
      author: dir, authorRole: 'DIRECTOR',
      targetBranches: ['ALL'], targetCampuses: ['ALL'], targetYears: ['ALL'],
      category: 'HOLIDAY', priority: 'MEDIUM',
      status: 'PUBLISHED', publishDate: new Date('2024-12-20'),
      approvalChain: [
        { role: 'HOD', status: 'APPROVED', approvedBy: hod, actionAt: new Date('2024-12-19') },
        { role: 'DEAN', status: 'APPROVED', approvedBy: dean, actionAt: new Date('2024-12-19') },
        { role: 'DIRECTOR', status: 'APPROVED', approvedBy: dir, actionAt: new Date('2024-12-20') },
      ],
      version: 1,
    },
  ];
};

// ──────────────────────────────────────────────────────────────────
// HELPER: Name generators
// ──────────────────────────────────────────────────────────────────
const studentNames = ['Arjun Reddy', 'Priya Sharma', 'Sai Kumar', 'Lakshmi Devi', 'Ravi Teja', 'Divya Nair', 'Venkat Rao', 'Sneha Patel', 'Kiran Kumar', 'Anitha Reddy', 'Suresh Babu', 'Radha Krishna', 'Mahesh Varma', 'Sunita Yadav', 'Naresh Gupta', 'Pooja Menon', 'Balaji Rao', 'Meena Kumari', 'Praveen Kumar', 'Sravani Devi'];
const facultyNames = ['Dr. Venkat Rao', 'Prof. Sujatha Kumari', 'Dr. Ramesh Chandra', 'Prof. Anitha Rao', 'Dr. Suresh Babu', 'Prof. Kavitha Devi', 'Dr. Nagaraju Reddy', 'Prof. Padma Latha', 'Dr. Kishore Kumar', 'Prof. Vasantha Kumari'];
const hodNames = ['Ramesh Chandra', 'Anitha Devi', 'Suresh Kumar', 'Padma Rao', 'Venkata Rao', 'Sujatha Nair', 'Narayana Swamy'];

const getStudentName = (i) => studentNames[i % studentNames.length];
const getFacultyName = (i) => facultyNames[i % facultyNames.length];
const getHODName = (i) => hodNames[i % hodNames.length];

// ──────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ──────────────────────────────────────────────────────────────────
const run = async () => {
  await mongoose.connect(MONGO_URI);
  await preHash();
  console.log('✅ MongoDB connected and passwords hashed\n');

  const db = mongoose.connection.db;
  const usersCol = db.collection('users');
  const postsCol = db.collection('posts');
  const circularsCol = db.collection('circulars');
  const notifCol = db.collection('notifications');
  const auditCol = db.collection('auditlogs');

  // Clear all collections
  await Promise.all([
    usersCol.deleteMany({}),
    postsCol.deleteMany({}),
    circularsCol.deleteMany({}),
    notifCol.deleteMany({}),
    auditCol.deleteMany({}),
  ]);
  console.log('🗑️  Cleared all collections\n');

  // Insert users
  const allUsers = await buildUsers();
  await usersCol.insertMany(allUsers);
  console.log(`✅ Inserted ${allUsers.length} users\n`);

  // Build a userMap for references
  const insertedUsers = await usersCol.find({}).toArray();
  const userMap = {};
  insertedUsers.forEach(u => {
    if (u.role === 'STUDENT') userMap[`student_${u.branch}_${Math.floor(Math.random() * 2)}`] = u._id;
    if (u.role === 'HOD') userMap[`hod_${u.branch}`] = u._id;
    if (u.role === 'DEAN' && u.campus === 'RK Valley') userMap['dean_RKValley'] = u._id;
    if (u.role === 'DIRECTOR') userMap['director'] = u._id;
  });

  // Assign specific students for posts
  const studentsByBranch = {};
  insertedUsers.filter(u => u.role === 'STUDENT').forEach(u => {
    if (!studentsByBranch[u.branch]) studentsByBranch[u.branch] = [];
    studentsByBranch[u.branch].push(u._id);
  });
  userMap['student_CSE_0'] = studentsByBranch['CSE']?.[0];
  userMap['student_CSE_1'] = studentsByBranch['CSE']?.[1];
  userMap['student_ECE_0'] = studentsByBranch['ECE']?.[0];
  userMap['student_CIVIL_0'] = studentsByBranch['CIVIL']?.[0];
  userMap['student_EEE_0'] = studentsByBranch['EEE']?.[0];
  userMap['student_MECH_0'] = studentsByBranch['MECH']?.[0];

  // Insert posts
  const postData = buildPosts(userMap).map(p => ({
    ...p,
    likes: [],
    comments: [],
    endorsements: [],
    shares: Math.floor(Math.random() * 20),
    bookmarks: [],
    version: 1,
    versions: [],
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  }));
  await postsCol.insertMany(postData);
  console.log(`✅ Inserted ${postData.length} posts\n`);

  // Insert circulars
  const circularData = buildCirculars(userMap).map(c => ({
    ...c,
    readBy: [],
    acknowledgedBy: [],
    requiresAcknowledgment: false,
    isActive: true,
    isArchived: false,
    versions: [],
    createdAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  }));
  await circularsCol.insertMany(circularData);
  console.log(`✅ Inserted ${circularData.length} circulars\n`);

  // Seed notifications for first student
  const firstStudent = insertedUsers.find(u => u.role === 'STUDENT');
  const firstCircular = await circularsCol.findOne({ status: 'PUBLISHED' });
  if (firstStudent && firstCircular) {
    await notifCol.insertMany([
      {
        recipient: firstStudent._id,
        type: 'NEW_CIRCULAR',
        title: `New Circular: ${firstCircular.title}`,
        message: 'A new EXAM circular has been published. Please check it.',
        relatedCircular: firstCircular._id,
        priority: 'HIGH',
        isRead: false,
        isEmergency: false,
        createdAt: new Date(),
      },
      {
        recipient: firstStudent._id,
        type: 'BADGE_EARNED',
        title: '🏆 Badge Earned: Early Adopter!',
        message: 'Congratulations! You earned the Early Adopter badge for being one of the first users.',
        priority: 'LOW',
        isRead: false,
        isEmergency: false,
        createdAt: new Date(Date.now() - 60000),
      },
    ]);
  }

  // Audit log entry
  await auditCol.insertOne({
    user: insertedUsers.find(u => u.role === 'ADMIN')?._id,
    action: 'SYSTEM',
    resourceType: 'System',
    details: { action: 'Database seeded', totalUsers: allUsers.length, totalPosts: postData.length, totalCirculars: circularData.length },
    userRole: 'ADMIN',
    campus: 'RK Valley',
    success: true,
    createdAt: new Date(),
  });

  console.log('─────────────────────────────────────────────────');
  console.log('📋 DEMO LOGIN CREDENTIALS');
  console.log('─────────────────────────────────────────────────');
  console.log('Role        | College ID   | Password');
  console.log('─────────────────────────────────────────────────');
  console.log('STUDENT (RK)| r220001      | student123');
  console.log('FACULTY     | F001CSE      | faculty123');
  console.log('HOD         | hod_cse      | hod12345');
  console.log('DSW         | DSW001       | dsw12345');
  console.log('DEAN        | DEAN001      | dean1234');
  console.log('DIRECTOR    | DIR001       | director1');
  console.log('SECURITY    | SEC001       | security1');
  console.log('ADMIN       | ADM001       | admin1234');
  console.log('─────────────────────────────────────────────────');
  console.log(`\n✅ ${allUsers.length} users across 4 campuses × 7 branches seeded`);
  console.log(`✅ ${postData.length} innovation posts seeded`);
  console.log(`✅ ${circularData.length} circulars seeded\n`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error('❌ Seed error:', err.message);
  process.exit(1);
});
