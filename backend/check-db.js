const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');
const Class = require('./models/Class');
const Classroom = require('./models/Classroom');
const Timeslot = require('./models/Timeslot');
const Subject = require('./models/Subject');
require('dotenv').config();

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('--- Database Stats ---');
    
    const [teachers, classes, classrooms, timeslots] = await Promise.all([
      Teacher.countDocuments(),
      Class.countDocuments(),
      Classroom.countDocuments(),
      Timeslot.find()
    ]);
    
    console.log(`Teachers: ${teachers}`);
    console.log(`Classes: ${classes}`);
    console.log(`Classrooms: ${classrooms}`);
    console.log(`Timeslot Configs: ${timeslots.length}`);
    
    timeslots.forEach((ts, i) => {
      console.log(`Config ${i+1}: Days: [${ts.days.join(', ')}] | Periods: ${ts.periods.length}`);
      ts.periods.forEach(p => {
        console.log(`  - P${p.periodNumber}: ${p.startTime}-${p.endTime} (Break: ${p.isBreak})`);
      });
    });
    
    if (classes > 0) {
      const allClasses = await Class.find().populate('subjects.subject subjects.teacher');
      let totalLessons = 0;
      allClasses.forEach(cls => {
        console.log(`Class: ${cls.name} | Subjects: ${cls.subjects.length}`);
        cls.subjects.forEach(s => {
          const hours = s.subject?.hoursPerWeek || 0;
          console.log(`  - Subject: ${s.subject?.name} | Teacher: ${s.teacher?.name} | Hours: ${hours}`);
          totalLessons += hours;
        });
      });
      console.log(`Total lessons to schedule: ${totalLessons}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkData();
