/**
 * Database Seeder — creates default user accounts only.
 * Run: node seed.js
 *
 * No sample questions are seeded. Each teacher creates their own
 * subjects, topics, and questions after logging in.
 */
require('dotenv').config();
const connectDB = require('./config/db');
const User     = require('./models/User');

const users = [
  { username: 'teacher',  password: 'teacher123',  name: 'Teacher Account',  role: 'teacher'  },
  { username: 'student1', password: 'student123',  name: 'Student One',      role: 'student'  },
  { username: 'student2', password: 'student123',  name: 'Student Two',      role: 'student'  },
];

const seed = async () => {
  await connectDB();
  try {
    await User.deleteMany({});
    console.log('Cleared existing users...');

    await User.create(users);
    console.log(`Created ${users.length} users`);

    console.log('\n✅ Seed complete!');
    console.log('  Teacher  → username: teacher  / password: teacher123');
    console.log('  Student1 → username: student1 / password: student123');
    console.log('  Student2 → username: student2 / password: student123');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
