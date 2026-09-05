const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Classroom = require('../models/Classroom');
const Timeslot = require('../models/Timeslot');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/chronogen';

async function seedDataForUser(userId) {
  const uid = new mongoose.Types.ObjectId(userId);

  console.log(`Seeding rich academic dataset for user ${uid}...`);

  // 1. Setup standard university Timeslots (Mon-Fri, 7 teaching periods, 1 lunch break)
  await Timeslot.deleteMany({ createdBy: uid });
  const timeslot = await Timeslot.create({
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periods: [
      { periodNumber: 1, startTime: '09:00', endTime: '10:00', isBreak: false },
      { periodNumber: 2, startTime: '10:00', endTime: '11:00', isBreak: false },
      { periodNumber: 3, startTime: '11:00', endTime: '12:00', isBreak: false },
      { periodNumber: 4, startTime: '12:00', endTime: '13:00', isBreak: false },
      { periodNumber: 5, startTime: '13:00', endTime: '14:00', isBreak: true }, // Lunch break
      { periodNumber: 6, startTime: '14:00', endTime: '15:00', isBreak: false },
      { periodNumber: 7, startTime: '15:00', endTime: '16:00', isBreak: false },
      { periodNumber: 8, startTime: '16:00', endTime: '17:00', isBreak: false }
    ],
    createdBy: uid
  });

  // 2. Classrooms & Labs
  await Classroom.deleteMany({ createdBy: uid });
  const classroomDefs = [
    { name: 'LH-101', capacity: 65, isLab: false, building: 'Academic Block A' },
    { name: 'LH-102', capacity: 60, isLab: false, building: 'Academic Block A' },
    { name: 'Room 201', capacity: 45, isLab: false, building: 'Academic Block B' },
    { name: 'Room 202', capacity: 45, isLab: false, building: 'Academic Block B' },
    { name: 'CS Lab 1', capacity: 40, isLab: true, building: 'Computer Science Wing' },
    { name: 'CS Lab 2', capacity: 35, isLab: true, building: 'AI & Systems Wing' }
  ];
  const classrooms = await Classroom.insertMany(classroomDefs.map(c => ({ ...c, createdBy: uid })));

  // 3. Subjects across courses (BTech, BCA, MCA)
  await Subject.deleteMany({ createdBy: uid });
  const subjectDefs = [
    // BTech CSE subjects
    { name: 'Data Structures & Algorithms', code: 'CS201', course: 'BTech', hoursPerWeek: 4, isLab: false },
    { name: 'Database Management Systems', code: 'CS301', course: 'BTech', hoursPerWeek: 3, isLab: false },
    { name: 'DBMS Lab', code: 'CS301L', course: 'BTech', hoursPerWeek: 2, isLab: true },
    { name: 'Operating Systems', code: 'CS302', course: 'BTech', hoursPerWeek: 3, isLab: false },
    { name: 'Computer Networks', code: 'CS303', course: 'BTech', hoursPerWeek: 3, isLab: false },
    { name: 'Web Technologies Lab', code: 'CS304L', course: 'BTech', hoursPerWeek: 2, isLab: true },

    // BCA subjects
    { name: 'Python Programming', code: 'BCA201', course: 'BCA', hoursPerWeek: 4, isLab: false },
    { name: 'Python Lab', code: 'BCA201L', course: 'BCA', hoursPerWeek: 2, isLab: true },
    { name: 'Software Engineering', code: 'BCA202', course: 'BCA', hoursPerWeek: 3, isLab: false },
    { name: 'Java Programming', code: 'BCA203', course: 'BCA', hoursPerWeek: 3, isLab: false },
    { name: 'Java Lab', code: 'BCA203L', course: 'BCA', hoursPerWeek: 2, isLab: true },

    // MCA subjects
    { name: 'Machine Learning & AI', code: 'MCA401', course: 'MCA', hoursPerWeek: 4, isLab: false },
    { name: 'AI & Deep Learning Lab', code: 'MCA401L', course: 'MCA', hoursPerWeek: 2, isLab: true },
    { name: 'Cloud Computing & DevOps', code: 'MCA402', course: 'MCA', hoursPerWeek: 3, isLab: false },
    { name: 'Cyber Security & Cryptography', code: 'MCA403', course: 'MCA', hoursPerWeek: 3, isLab: false }
  ];
  const subjects = await Subject.insertMany(subjectDefs.map(s => ({ ...s, createdBy: uid })));

  const subMap = {};
  subjects.forEach(s => { subMap[s.code] = s; });

  // 4. Faculty / Teachers with availability & subjects
  await Teacher.deleteMany({ createdBy: uid });
  const activePeriods = [1, 2, 3, 4, 6, 7, 8];
  const standardAvailability = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => ({
    day,
    periods: activePeriods
  }));

  const teacherDefs = [
    {
      name: 'Dr. Rajesh Sharma',
      email: 'rajesh.sharma@chronogen.edu',
      course: 'BTech',
      subjects: [subMap['CS201']._id, subMap['CS302']._id],
      availability: standardAvailability,
      maxHoursPerDay: 6,
      maxHoursPerWeek: 24
    },
    {
      name: 'Prof. Priya Verma',
      email: 'priya.verma@chronogen.edu',
      course: 'BTech',
      subjects: [subMap['CS301']._id, subMap['CS301L']._id],
      availability: standardAvailability,
      maxHoursPerDay: 6,
      maxHoursPerWeek: 20
    },
    {
      name: 'Dr. Amit Patel',
      email: 'amit.patel@chronogen.edu',
      course: 'BTech',
      subjects: [subMap['CS303']._id, subMap['CS304L']._id],
      availability: standardAvailability,
      maxHoursPerDay: 6,
      maxHoursPerWeek: 20
    },
    {
      name: 'Prof. Sneha Kulkarni',
      email: 'sneha.kulkarni@chronogen.edu',
      course: 'BCA',
      subjects: [subMap['BCA201']._id, subMap['BCA201L']._id],
      availability: standardAvailability,
      maxHoursPerDay: 6,
      maxHoursPerWeek: 20
    },
    {
      name: 'Dr. Vikram Malhotra',
      email: 'vikram.malhotra@chronogen.edu',
      course: 'BCA',
      subjects: [subMap['BCA202']._id, subMap['BCA203']._id, subMap['BCA203L']._id],
      availability: standardAvailability,
      maxHoursPerDay: 6,
      maxHoursPerWeek: 24
    },
    {
      name: 'Dr. Ananya Sen',
      email: 'ananya.sen@chronogen.edu',
      course: 'MCA',
      subjects: [subMap['MCA401']._id, subMap['MCA401L']._id],
      availability: standardAvailability,
      maxHoursPerDay: 6,
      maxHoursPerWeek: 20
    },
    {
      name: 'Prof. Rohan Mehta',
      email: 'rohan.mehta@chronogen.edu',
      course: 'MCA',
      subjects: [subMap['MCA402']._id, subMap['MCA403']._id],
      availability: standardAvailability,
      maxHoursPerDay: 6,
      maxHoursPerWeek: 20
    }
  ];
  const teachers = await Teacher.insertMany(teacherDefs.map(t => ({ ...t, createdBy: uid })));

  const teacherMap = {};
  teachers.forEach(t => { teacherMap[t.name] = t; });

  // 5. Classes & Batches mapped to Subjects and Teachers
  await Class.deleteMany({ createdBy: uid });
  const classDefs = [
    {
      name: 'B.Tech CSE',
      section: 'A',
      strength: 60,
      subjects: [
        { subject: subMap['CS201']._id, teacher: teacherMap['Dr. Rajesh Sharma']._id },
        { subject: subMap['CS301']._id, teacher: teacherMap['Prof. Priya Verma']._id },
        { subject: subMap['CS301L']._id, teacher: teacherMap['Prof. Priya Verma']._id },
        { subject: subMap['CS302']._id, teacher: teacherMap['Dr. Rajesh Sharma']._id },
        { subject: subMap['CS303']._id, teacher: teacherMap['Dr. Amit Patel']._id },
        { subject: subMap['CS304L']._id, teacher: teacherMap['Dr. Amit Patel']._id }
      ]
    },
    {
      name: 'B.Tech CSE',
      section: 'B',
      strength: 55,
      subjects: [
        { subject: subMap['CS201']._id, teacher: teacherMap['Dr. Rajesh Sharma']._id },
        { subject: subMap['CS301']._id, teacher: teacherMap['Prof. Priya Verma']._id },
        { subject: subMap['CS302']._id, teacher: teacherMap['Dr. Rajesh Sharma']._id },
        { subject: subMap['CS303']._id, teacher: teacherMap['Dr. Amit Patel']._id }
      ]
    },
    {
      name: 'BCA',
      section: '2nd Year',
      strength: 45,
      subjects: [
        { subject: subMap['BCA201']._id, teacher: teacherMap['Prof. Sneha Kulkarni']._id },
        { subject: subMap['BCA201L']._id, teacher: teacherMap['Prof. Sneha Kulkarni']._id },
        { subject: subMap['BCA202']._id, teacher: teacherMap['Dr. Vikram Malhotra']._id },
        { subject: subMap['BCA203']._id, teacher: teacherMap['Dr. Vikram Malhotra']._id },
        { subject: subMap['BCA203L']._id, teacher: teacherMap['Dr. Vikram Malhotra']._id }
      ]
    },
    {
      name: 'MCA',
      section: '1st Year',
      strength: 35,
      subjects: [
        { subject: subMap['MCA401']._id, teacher: teacherMap['Dr. Ananya Sen']._id },
        { subject: subMap['MCA401L']._id, teacher: teacherMap['Dr. Ananya Sen']._id },
        { subject: subMap['MCA402']._id, teacher: teacherMap['Prof. Rohan Mehta']._id },
        { subject: subMap['MCA403']._id, teacher: teacherMap['Prof. Rohan Mehta']._id }
      ]
    }
  ];
  const classes = await Class.insertMany(classDefs.map(c => ({ ...c, createdBy: uid })));

  return {
    timeslot,
    classroomsCount: classrooms.length,
    subjectsCount: subjects.length,
    teachersCount: teachers.length,
    classesCount: classes.length
  };
}

module.exports = { seedDataForUser };

if (require.main === module) {
  mongoose.connect(MONGO_URI).then(async () => {
    try {
      const user = await User.findOne({});
      if (!user) {
        console.error('No user found in database');
        process.exit(1);
      }
      const result = await seedDataForUser(user._id);
      console.log('✅ Seed completed successfully:', result);
      process.exit(0);
    } catch (err) {
      console.error('Seed error:', err);
      process.exit(1);
    }
  });
}
