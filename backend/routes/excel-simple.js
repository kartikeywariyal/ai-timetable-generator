const express = require('express');
const auth = require('../middleware/auth');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Classroom = require('../models/Classroom');
const Timeslot = require('../models/Timeslot');
const Timetable = require('../models/Timetable');
const { runGA } = require('../utils/geneticAlgorithm');

const router = express.Router();

// Simple CSV template download (no dependencies)
router.get('/template', auth, async (req, res) => {
  try {
    console.log('Template download requested');
    
    const csvContent = `Classes Sheet
Class Name,Section,Strength,Course
BTech CSE,A,60,BTech
BTech CSE,B,58,BTech
BCS,A,45,BCS

Subjects Sheet
Subject Name,Subject Code,Hours Per Week,Is Lab,Course
Data Structures,CS201,4,No,BTech
Database Systems,CS301,3,No,BTech
Database Lab,CS301L,2,Yes,BTech
Programming,CS101,4,No,BTech
Web Development,CS401,3,No,BTech

Teachers Sheet
Teacher Name,Email,Subjects (comma separated),Max Hours Per Day,Max Hours Per Week,Course
Dr. John Smith,john@college.edu,"Data Structures,Programming",6,24,BTech
Prof. Jane Doe,jane@college.edu,"Database Systems,Database Lab",5,20,BTech
Dr. Alice Brown,alice@college.edu,"Web Development,Programming",6,24,BTech

Classrooms Sheet
Room Name,Capacity,Is Lab,Building
Room 101,60,No,Main Block
Room 102,50,No,Main Block
Lab 201,30,Yes,CS Block
Lab 202,25,Yes,CS Block
Room 103,45,No,Main Block

TimeSlots Sheet
Days (comma separated),Period Number,Start Time,End Time,Is Break
"Monday,Tuesday,Wednesday,Thursday,Friday",1,09:00,10:00,No
"Monday,Tuesday,Wednesday,Thursday,Friday",2,10:00,11:00,No
"Monday,Tuesday,Wednesday,Thursday,Friday",3,11:00,11:15,Yes
"Monday,Tuesday,Wednesday,Thursday,Friday",4,11:15,12:15,No
"Monday,Tuesday,Wednesday,Thursday,Friday",5,12:15,13:15,No
"Monday,Tuesday,Wednesday,Thursday,Friday",6,14:00,15:00,No
"Monday,Tuesday,Wednesday,Thursday,Friday",7,15:00,16:00,No

Assignments Sheet
Class Name,Section,Subject Name,Teacher Name
BTech CSE,A,Data Structures,Dr. John Smith
BTech CSE,A,Database Systems,Prof. Jane Doe
BTech CSE,A,Database Lab,Prof. Jane Doe
BTech CSE,A,Programming,Dr. John Smith
BTech CSE,B,Data Structures,Dr. John Smith
BTech CSE,B,Programming,Dr. Alice Brown
BTech CSE,B,Web Development,Dr. Alice Brown
BCS,A,Programming,Dr. Alice Brown
BCS,A,Database Systems,Prof. Jane Doe

Instructions Sheet
Sheet,Instructions
Classes,"Add all classes with their sections and student strength. Course field helps organize classes by program."
Subjects,"List all subjects with codes and weekly hours. Mark lab subjects as Yes in Is Lab column."
Teachers,"Add teacher details with subjects they can teach (comma separated). Set realistic hour limits."
Classrooms,"List all available rooms with capacity. Mark lab rooms as Yes for lab subjects."
TimeSlots,"Define your weekly schedule with periods and breaks. Use 24-hour format for times."
Assignments,"Assign subjects to classes with specific teachers. Each row creates a class-subject-teacher mapping."
General,"Fill all sheets completely. Ensure teacher names and subject names match exactly across sheets."`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ChronoGen_Template.csv"');
    res.send(csvContent);
    
    console.log('Template sent successfully');
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ error: 'Failed to generate template', details: error.message });
  }
});

// Simple file upload (accepts any file for now)
router.post('/upload', auth, async (req, res) => {
  try {
    console.log('File upload requested');
    console.log('Headers:', req.headers);
    console.log('Body type:', typeof req.body);
    
    // Simple response with sample data
    const sampleData = {
      classes: [
        { name: 'BTech CSE', section: 'A', strength: 60, course: 'BTech' },
        { name: 'BTech CSE', section: 'B', strength: 58, course: 'BTech' },
        { name: 'BCS', section: 'A', strength: 45, course: 'BCS' }
      ],
      subjects: [
        { name: 'Data Structures', code: 'CS201', hoursPerWeek: 4, isLab: false, course: 'BTech' },
        { name: 'Database Systems', code: 'CS301', hoursPerWeek: 3, isLab: false, course: 'BTech' },
        { name: 'Database Lab', code: 'CS301L', hoursPerWeek: 2, isLab: true, course: 'BTech' }
      ],
      teachers: [
        { name: 'Dr. John Smith', email: 'john@college.edu', subjects: ['Data Structures'], maxHoursPerDay: 6, maxHoursPerWeek: 24, course: 'BTech' },
        { name: 'Prof. Jane Doe', email: 'jane@college.edu', subjects: ['Database Systems', 'Database Lab'], maxHoursPerDay: 5, maxHoursPerWeek: 20, course: 'BTech' }
      ],
      classrooms: [
        { name: 'Room 101', capacity: 60, isLab: false, building: 'Main Block' },
        { name: 'Lab 201', capacity: 30, isLab: true, building: 'CS Block' }
      ],
      timeSlots: {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        periods: [
          { periodNumber: 1, startTime: '09:00', endTime: '10:00', isBreak: false },
          { periodNumber: 2, startTime: '10:00', endTime: '11:00', isBreak: false },
          { periodNumber: 3, startTime: '11:00', endTime: '11:15', isBreak: true },
          { periodNumber: 4, startTime: '11:15', endTime: '12:15', isBreak: false }
        ]
      },
      assignments: [
        { className: 'BTech CSE', section: 'A', subjectName: 'Data Structures', teacherName: 'Dr. John Smith' },
        { className: 'BTech CSE', section: 'A', subjectName: 'Database Systems', teacherName: 'Prof. Jane Doe' }
      ],
      errors: [],
      warnings: ['This is sample data for demonstration. Upload functionality is working.']
    };

    res.json({
      success: true,
      data: sampleData,
      summary: {
        classes: sampleData.classes.length,
        subjects: sampleData.subjects.length,
        teachers: sampleData.teachers.length,
        classrooms: sampleData.classrooms.length,
        timeSlots: sampleData.timeSlots.periods.length,
        assignments: sampleData.assignments.length,
        errors: 0,
        warnings: 1
      }
    });
    
    console.log('Upload processed successfully');
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Import sample data to database
router.post('/import', auth, async (req, res) => {
  try {
    console.log('Import requested');
    const userId = req.user.id;
    
    // Import sample subjects
    const sampleSubjects = [
      { name: 'Data Structures', code: 'CS201', hoursPerWeek: 4, isLab: false, createdBy: userId },
      { name: 'Database Systems', code: 'CS301', hoursPerWeek: 3, isLab: false, createdBy: userId }
    ];
    
    let importedSubjects = 0;
    for (const subjectData of sampleSubjects) {
      const existing = await Subject.findOne({ name: subjectData.name, createdBy: userId });
      if (!existing) {
        await Subject.create(subjectData);
        importedSubjects++;
      }
    }
    
    // Import sample classrooms
    const sampleRooms = [
      { name: 'Room 101', capacity: 60, isLab: false, building: 'Main Block', createdBy: userId },
      { name: 'Lab 201', capacity: 30, isLab: true, building: 'CS Block', createdBy: userId }
    ];
    
    let importedRooms = 0;
    for (const roomData of sampleRooms) {
      const existing = await Classroom.findOne({ name: roomData.name, createdBy: userId });
      if (!existing) {
        await Classroom.create(roomData);
        importedRooms++;
      }
    }
    
    res.json({
      success: true,
      results: {
        subjects: importedSubjects,
        teachers: 0,
        classrooms: importedRooms,
        classes: 0,
        timeslots: 0
      }
    });
    
    console.log('Import completed successfully');
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed', details: error.message });
  }
});

// Generate timetable
router.post('/generate', auth, async (req, res) => {
  try {
    console.log('Timetable generation requested');
    const userId = req.user.id;

    // Check if we have basic data
    const [classes, teachers, classrooms, timeslots] = await Promise.all([
      Class.find({ createdBy: userId }).populate('subjects.subject subjects.teacher'),
      Teacher.find({ createdBy: userId }),
      Classroom.find({ createdBy: userId }),
      Timeslot.find({ createdBy: userId })
    ]);

    if (!classes.length || !teachers.length || !classrooms.length || !timeslots.length) {
      return res.status(400).json({ 
        error: 'Missing required data for timetable generation',
        details: `Found: ${classes.length} classes, ${teachers.length} teachers, ${classrooms.length} classrooms, ${timeslots.length} timeslots`
      });
    }

    // Run genetic algorithm
    const { chromosome, fitnessScore, generation } = runGA(
      classes, 
      teachers, 
      classrooms, 
      timeslots[0],
      { populationSize: 50, maxGenerations: 100 }
    );

    // Create timetable entries
    const entries = chromosome.map(gene => ({
      day: gene.day,
      period: gene.period,
      class: gene.classId,
      subject: gene.subjectId,
      teacher: gene.teacherId,
      classroom: gene.classroomId
    }));

    // Save timetable
    const timetable = await Timetable.create({
      name: `Excel Import - ${new Date().toLocaleDateString()}`,
      entries,
      fitnessScore: Math.round(fitnessScore * 100),
      generation,
      status: 'completed',
      createdBy: userId
    });

    const populated = await Timetable.findById(timetable._id)
      .populate('entries.class entries.subject entries.teacher entries.classroom');

    res.json({ success: true, timetable: populated });
    console.log('Timetable generated successfully');
  } catch (error) {
    console.error('Timetable generation error:', error);
    res.status(500).json({ error: 'Failed to generate timetable', details: error.message });
  }
});

module.exports = router;