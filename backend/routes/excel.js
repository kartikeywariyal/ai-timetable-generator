const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Classroom = require('../models/Classroom');
const Timeslot = require('../models/Timeslot');
const Timetable = require('../models/Timetable');
const { runGA } = require('../utils/geneticAlgorithm');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files allowed'), false);
    }
  }
});

// Download Excel template (no auth for testing)
router.get('/template-test', async (req, res) => {
  try {
    // Simple test without ExcelService
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    const sheet = workbook.addWorksheet('Test');
    sheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Value', key: 'value', width: 15 }
    ];
    
    sheet.addRows([
      { name: 'Test 1', value: 'Working' },
      { name: 'Test 2', value: 'Success' }
    ]);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Test.xlsx"');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Test template error:', error);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Simple template download without ExcelService dependency
router.get('/template', auth, async (req, res) => {
  try {
    // Create template data as JSON first
    const templateData = {
      classes: [
        { name: 'BTech CSE', section: 'A', strength: 60, course: 'BTech' },
        { name: 'BTech CSE', section: 'B', strength: 58, course: 'BTech' },
        { name: 'BCS', section: 'A', strength: 45, course: 'BCS' }
      ],
      subjects: [
        { name: 'Data Structures', code: 'CS201', hoursPerWeek: 4, isLab: 'No', course: 'BTech' },
        { name: 'Database Systems', code: 'CS301', hoursPerWeek: 3, isLab: 'No', course: 'BTech' },
        { name: 'Database Lab', code: 'CS301L', hoursPerWeek: 2, isLab: 'Yes', course: 'BTech' }
      ],
      teachers: [
        { name: 'Dr. John Smith', email: 'john@college.edu', subjects: 'Data Structures,Algorithms', maxHoursPerDay: 6, maxHoursPerWeek: 24, course: 'BTech' },
        { name: 'Prof. Jane Doe', email: 'jane@college.edu', subjects: 'Database Systems,Database Lab', maxHoursPerDay: 5, maxHoursPerWeek: 20, course: 'BTech' }
      ],
      classrooms: [
        { name: 'Room 101', capacity: 60, isLab: 'No', building: 'Main Block' },
        { name: 'Lab 201', capacity: 30, isLab: 'Yes', building: 'CS Block' },
        { name: 'Room 102', capacity: 50, isLab: 'No', building: 'Main Block' }
      ],
      timeSlots: [
        { days: 'Monday,Tuesday,Wednesday,Thursday,Friday', periodNumber: 1, startTime: '09:00', endTime: '10:00', isBreak: 'No' },
        { days: 'Monday,Tuesday,Wednesday,Thursday,Friday', periodNumber: 2, startTime: '10:00', endTime: '11:00', isBreak: 'No' },
        { days: 'Monday,Tuesday,Wednesday,Thursday,Friday', periodNumber: 3, startTime: '11:00', endTime: '11:15', isBreak: 'Yes' },
        { days: 'Monday,Tuesday,Wednesday,Thursday,Friday', periodNumber: 4, startTime: '11:15', endTime: '12:15', isBreak: 'No' },
        { days: 'Monday,Tuesday,Wednesday,Thursday,Friday', periodNumber: 5, startTime: '12:15', endTime: '13:15', isBreak: 'No' }
      ],
      assignments: [
        { className: 'BTech CSE', section: 'A', subjectName: 'Data Structures', teacherName: 'Dr. John Smith' },
        { className: 'BTech CSE', section: 'A', subjectName: 'Database Systems', teacherName: 'Prof. Jane Doe' },
        { className: 'BTech CSE', section: 'B', subjectName: 'Data Structures', teacherName: 'Dr. John Smith' }
      ]
    };

    // Try to use ExcelJS if available, otherwise send CSV
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();

      // Create sheets
      const sheets = [
        { name: 'Classes', data: templateData.classes },
        { name: 'Subjects', data: templateData.subjects },
        { name: 'Teachers', data: templateData.teachers },
        { name: 'Classrooms', data: templateData.classrooms },
        { name: 'TimeSlots', data: templateData.timeSlots },
        { name: 'Assignments', data: templateData.assignments }
      ];

      sheets.forEach(({ name, data }) => {
        const sheet = workbook.addWorksheet(name);
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          sheet.columns = headers.map(header => ({ 
            header: header.charAt(0).toUpperCase() + header.slice(1), 
            key: header, 
            width: 20 
          }));
          sheet.addRows(data);
          
          // Style header
          const headerRow = sheet.getRow(1);
          headerRow.font = { bold: true };
          headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="ChronoGen_Template.xlsx"');
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (excelError) {
      console.log('ExcelJS not available, sending CSV:', excelError.message);
      
      // Fallback to CSV
      let csvContent = '';
      
      Object.keys(templateData).forEach(sheetName => {
        csvContent += `\n\n=== ${sheetName.toUpperCase()} ===\n`;
        const data = templateData[sheetName];
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          csvContent += headers.join(',') + '\n';
          data.forEach(row => {
            csvContent += headers.map(header => row[header] || '').join(',') + '\n';
          });
        }
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ChronoGen_Template.csv"');
      res.send(csvContent);
    }
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ error: 'Failed to generate template', details: error.message });
  }
});

// Upload and parse Excel file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const result = {
      classes: [], subjects: [], teachers: [], classrooms: [],
      timeSlots: { days: [], periods: [] }, assignments: [],
      errors: [], warnings: []
    };

    const getSheet = name => workbook.getWorksheet(name);
    const rowToObj = row => {
      const obj = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const header = row.worksheet.getRow(1).getCell(col).value;
        if (header) obj[String(header).trim()] = cell.value !== null ? cell.value : '';
      });
      return obj;
    };
    const sheetRows = name => {
      const sheet = getSheet(name);
      if (!sheet) return [];
      const rows = [];
      sheet.eachRow((row, i) => { if (i > 1) rows.push(rowToObj(row)); });
      return rows;
    };

    // Parse Classes
    for (const r of sheetRows('Classes')) {
      if (!r['Class Name']) continue;
      result.classes.push({ name: String(r['Class Name']), section: String(r['Section'] || 'A'), strength: Number(r['Strength']) || 30, course: String(r['Course'] || '') });
    }

    // Parse Subjects
    for (const r of sheetRows('Subjects')) {
      if (!r['Subject Name']) continue;
      result.subjects.push({ name: String(r['Subject Name']), code: String(r['Subject Code'] || ''), hoursPerWeek: Number(r['Hours Per Week']) || 3, isLab: String(r['Is Lab']).toLowerCase() === 'yes' || r['Is Lab'] === true, course: String(r['Course'] || '') });
    }

    // Parse Teachers
    for (const r of sheetRows('Teachers')) {
      if (!r['Teacher Name']) continue;
      const subjectsRaw = r['Subjects'] || r['Subject Preferences'] || '';
      result.teachers.push({ name: String(r['Teacher Name']), email: String(r['Email'] || ''), subjects: String(subjectsRaw).split(',').map(s => s.trim()).filter(Boolean), maxHoursPerDay: Number(r['Max Hours Per Day']) || 6, maxHoursPerWeek: Number(r['Max Hours Per Week']) || 24, course: String(r['Course'] || 'General') });
    }

    // Parse Classrooms
    for (const r of sheetRows('Classrooms')) {
      if (!r['Room Name']) continue;
      result.classrooms.push({ name: String(r['Room Name']), capacity: Number(r['Capacity']) || 30, isLab: String(r['Is Lab']).toLowerCase() === 'yes' || r['Is Lab'] === true, building: String(r['Building'] || 'Main') });
    }

    // Parse TimeSlots — keep ALL periods including breaks
    const tsRows = sheetRows('TimeSlots');
    const daysSet = new Set();
    for (const r of tsRows) {
      const isBreak = String(r['Is Break']).toLowerCase() === 'yes' || r['Is Break'] === true;
      String(r['Days'] || '').split(',').forEach(d => { if (d.trim()) daysSet.add(d.trim()); });
      result.timeSlots.periods.push({
        periodNumber: Number(r['Period Number']),
        startTime: String(r['Start Time'] || ''),
        endTime: String(r['End Time'] || ''),
        isBreak
      });
    }
    result.timeSlots.days = [...daysSet].filter(Boolean);

    // Parse Assignments
    for (const r of sheetRows('Assignments')) {
      if (!r['Class Name'] || !r['Subject Name'] || !r['Teacher Name']) continue;
      result.assignments.push({ className: String(r['Class Name']), section: String(r['Section'] || 'A'), subjectName: String(r['Subject Name']), teacherName: String(r['Teacher Name']) });
    }

    if (!result.classes.length) result.errors.push('No classes found. Check Classes sheet.');
    if (!result.subjects.length) result.errors.push('No subjects found. Check Subjects sheet.');
    if (!result.teachers.length) result.errors.push('No teachers found. Check Teachers sheet.');
    if (!result.classrooms.length) result.errors.push('No classrooms found. Check Classrooms sheet.');
    if (!result.timeSlots.periods.length) result.errors.push('No time slots found. Check TimeSlots sheet.');
    if (!result.assignments.length) result.warnings.push('No assignments found. Classes may have no subjects assigned.');

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to parse Excel file', details: error.message });
  }
});

// Import data to database
router.post('/import', auth, async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || data.errors.length > 0) {
      return res.status(400).json({ error: 'Invalid data or errors present' });
    }

    const userId = req.user.id;
    const results = { subjects: 0, teachers: 0, classrooms: 0, classes: 0, timeslots: 0 };

    // Import subjects
    for (const subjectData of data.subjects) {
      const existing = await Subject.findOne({ name: subjectData.name, createdBy: userId });
      if (!existing) {
        await Subject.create({
          ...subjectData,
          course: subjectData.course || 'General',
          createdBy: userId
        });
        results.subjects++;
      }
    }

    // Import classrooms
    for (const roomData of data.classrooms) {
      const existing = await Classroom.findOne({ name: roomData.name, createdBy: userId });
      if (!existing) {
        await Classroom.create({ ...roomData, createdBy: userId });
        results.classrooms++;
      }
    }

    // Import teachers
    for (const teacherData of data.teachers) {
      const existing = await Teacher.findOne({ name: teacherData.name, createdBy: userId });
      if (!existing) {
        // Find subject IDs
        const subjectIds = [];
        for (const subjectName of teacherData.subjects) {
          const subject = await Subject.findOne({ name: subjectName, createdBy: userId });
          if (subject) subjectIds.push(subject._id);
        }

        await Teacher.create({
          name: teacherData.name,
          email: teacherData.email,
          course: teacherData.course || 'General',
          subjects: subjectIds,
          maxHoursPerDay: teacherData.maxHoursPerDay,
          maxHoursPerWeek: teacherData.maxHoursPerWeek,
          createdBy: userId
        });
        results.teachers++;
      }
    }

    // Import classes with assignments
    for (const classData of data.classes) {
      const existing = await Class.findOne({ 
        name: classData.name, 
        section: classData.section, 
        createdBy: userId 
      });
      
      if (!existing) {
        // Build subject-teacher assignments
        const subjects = [];
        const classAssignments = data.assignments.filter(a => 
          a.className === classData.name && a.section === classData.section
        );

        for (const assignment of classAssignments) {
          const subject = await Subject.findOne({ name: assignment.subjectName, createdBy: userId });
          const teacher = await Teacher.findOne({ name: assignment.teacherName, createdBy: userId });
          
          if (subject && teacher) {
            subjects.push({ subject: subject._id, teacher: teacher._id });
          }
        }

        await Class.create({
          name: classData.name,
          section: classData.section,
          strength: classData.strength,
          subjects: subjects,
          createdBy: userId
        });
        results.classes++;
      }
    }

    // Import timeslots
    const existingTimeslot = await Timeslot.findOne({ createdBy: userId });
    if (!existingTimeslot && data.timeSlots.periods.length > 0) {
      await Timeslot.create({
        days: data.timeSlots.days,
        periods: data.timeSlots.periods,
        createdBy: userId
      });
      results.timeslots = 1;
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// Generate timetable directly from parsed Excel data
router.post('/generate', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data } = req.body;

    if (!data) return res.status(400).json({ error: 'No data provided' });

    console.log('Excel generate - data received:', {
      classes: data.classes?.length,
      subjects: data.subjects?.length,
      teachers: data.teachers?.length,
      classrooms: data.classrooms?.length,
      periods: data.timeSlots?.periods?.length,
      days: data.timeSlots?.days,
      assignments: data.assignments?.length
    });

    // Save subjects
    const subjectMap = {};
    for (const s of data.subjects) {
      let subject = await Subject.findOne({ name: s.name, createdBy: userId });
      if (!subject) subject = await Subject.create({
        name: s.name, code: s.code,
        hoursPerWeek: s.hoursPerWeek || 3,
        isLab: s.isLab === true || s.isLab === 'Yes' || s.isLab === 'true',
        course: s.course || 'General',
        createdBy: userId
      });
      subjectMap[s.name] = subject._id;
    }

    // Save classrooms
    for (const r of data.classrooms) {
      const exists = await Classroom.findOne({ name: r.name, createdBy: userId });
      if (!exists) await Classroom.create({
        name: r.name, capacity: r.capacity || 30,
        isLab: r.isLab === true || r.isLab === 'Yes' || r.isLab === 'true',
        building: r.building || 'Main',
        createdBy: userId
      });
    }

    // Save teachers
    const teacherMap = {};
    for (const t of data.teachers) {
      let teacher = await Teacher.findOne({ name: t.name, createdBy: userId });
      if (!teacher) {
        const subjectIds = (t.subjects || []).map(n => subjectMap[n]).filter(Boolean);
        teacher = await Teacher.create({
          name: t.name, email: t.email,
          subjects: subjectIds,
          course: t.course || 'General',
          maxHoursPerDay: t.maxHoursPerDay || 6,
          maxHoursPerWeek: t.maxHoursPerWeek || 24,
          createdBy: userId
        });
      }
      teacherMap[t.name] = teacher._id;
    }

    // Save classes with subject-teacher assignments
    for (const c of data.classes) {
      const exists = await Class.findOne({ name: c.name, section: c.section, createdBy: userId });
      if (!exists) {
        const subjects = (data.assignments || [])
          .filter(a => a.className === c.name && a.section === c.section)
          .map(a => ({ subject: subjectMap[a.subjectName], teacher: teacherMap[a.teacherName] }))
          .filter(s => s.subject && s.teacher);
        await Class.create({
          name: c.name, section: c.section,
          strength: c.strength || 30,
          subjects, createdBy: userId
        });
      }
    }

    // Save timeslot — include ALL periods (breaks too) so GA filters correctly
    const existingTimeslot = await Timeslot.findOne({ createdBy: userId });
    if (!existingTimeslot && data.timeSlots) {
      // Rebuild full periods array including breaks from original parsed data
      await Timeslot.create({
        days: data.timeSlots.days,
        periods: data.timeSlots.periods,
        createdBy: userId
      });
    }

    // Fetch everything and run GA
    const [classes, teachers, classrooms, timeslots] = await Promise.all([
      Class.find({ createdBy: userId }).populate('subjects.subject subjects.teacher'),
      Teacher.find({ createdBy: userId }),
      Classroom.find({ createdBy: userId }),
      Timeslot.find({ createdBy: userId })
    ]);

    if (!classes.length) return res.status(400).json({ error: 'No classes found after import' });
    if (!teachers.length) return res.status(400).json({ error: 'No teachers found after import' });
    if (!classrooms.length) return res.status(400).json({ error: 'No classrooms found after import' });
    if (!timeslots.length) return res.status(400).json({ error: 'No timeslot configuration found' });

    // Verify at least one class has subjects
    const classesWithSubjects = classes.filter(c => c.subjects && c.subjects.length > 0);
    console.log('After save - classes:', classes.length, 'with subjects:', classesWithSubjects.length, 'teachers:', teachers.length, 'classrooms:', classrooms.length, 'timeslots:', timeslots.length);
    if (timeslots.length) console.log('Timeslot days:', timeslots[0].days, 'periods:', timeslots[0].periods?.length);
    if (!classesWithSubjects.length) {
      return res.status(400).json({ error: 'No classes have subjects assigned. Check Assignments sheet.' });
    }

    const { chromosome, fitnessScore, generation } = runGA(
      classes, teachers, classrooms, timeslots[0],
      { populationSize: 50, maxGenerations: 200 }
    );

    console.log('GA result:', { fitnessScore, generation, chromosomeLength: chromosome?.length });

    const entries = chromosome
      .map(gene => ({
        day: gene.day, period: gene.period,
        class: gene.classId, subject: gene.subjectId,
        teacher: gene.teacherId, classroom: gene.classroomId
      }))
      .filter(e => e.class && e.subject && e.teacher && e.classroom);

    console.log('Valid entries:', entries.length);

    if (!entries.length) {
      return res.status(400).json({ error: 'GA produced no valid entries. Check that subjects and teachers are properly assigned.' });
    }

    const timetable = await Timetable.create({
      name: `Excel Import - ${new Date().toLocaleDateString()}`,
      entries,
      fitnessScore: Math.round(fitnessScore * 100),
      generation, status: 'completed', createdBy: userId
    });

    const populated = await Timetable.findById(timetable._id)
      .populate('entries.class entries.subject entries.teacher entries.classroom');

    res.json({ success: true, timetable: populated });
  } catch (error) {
    console.error('Timetable generation error:', error);
    res.status(500).json({ error: 'Failed to generate timetable', details: error.message });
  }
});

module.exports = router;