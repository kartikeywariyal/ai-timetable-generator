const express = require('express');
const Semester = require('../models/Semester');
const SyllabusProgress = require('../models/SyllabusProgress');
const WeeklyTimetable = require('../models/WeeklyTimetable');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const Classroom = require('../models/Classroom');
const Timeslot = require('../models/Timeslot');
const SemesterTimetableGenerator = require('../utils/semesterTimetableGenerator');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all semesters
router.get('/', auth, async (req, res) => {
  try {
    const semesters = await Semester.find({ createdBy: req.user.id })
      .populate('doublePeriods.preferredSubjects')
      .sort('-createdAt');
    res.json(semesters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create semester
router.post('/', auth, async (req, res) => {
  try {
    const semester = await Semester.create({
      ...req.body,
      createdBy: req.user.id
    });
    
    // Calculate teaching days
    semester.calculateTeachingDays();
    await semester.save();
    
    res.status(201).json(semester);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update semester
router.put('/:id', auth, async (req, res) => {
  try {
    const semester = await Semester.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true }
    );
    
    if (!semester) return res.status(404).json({ message: 'Semester not found' });
    
    // Recalculate teaching days if dates or holidays changed
    if (req.body.startDate || req.body.endDate || req.body.holidays) {
      semester.calculateTeachingDays();
      await semester.save();
    }
    
    res.json(semester);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add holiday to semester
router.post('/:id/holidays', auth, async (req, res) => {
  try {
    const semester = await Semester.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!semester) return res.status(404).json({ message: 'Semester not found' });
    
    semester.holidays.push(req.body);
    semester.calculateTeachingDays();
    await semester.save();
    
    // Analyze impact and suggest redistribution
    const impact = await analyzeHolidayImpact(semester, req.body);
    
    res.json({ semester, impact });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Analyze holiday impact
async function analyzeHolidayImpact(semester, holiday) {
  const startDate = new Date(holiday.startDate);
  const endDate = new Date(holiday.endDate);
  const workingDays = semester.academicCalendar.weeklySchedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  let affectedDays = 0;
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    if (workingDays.includes(dayName)) {
      affectedDays++;
    }
  }
  
  const periodsPerDay = semester.academicCalendar.periodsPerDay || 6;
  const totalLostPeriods = affectedDays * periodsPerDay;
  
  // Find affected timetables
  const timetables = await Timetable.find({ createdBy: semester.createdBy });
  const affectedClasses = new Set();
  const subjectImpact = {};
  
  timetables.forEach(tt => {
    tt.entries.forEach(entry => {
      const entryDate = new Date(); // This would need actual date mapping
      if (workingDays.includes(entry.day)) {
        affectedClasses.add(entry.class?.toString());
        const subjectId = entry.subject?.toString();
        if (!subjectImpact[subjectId]) {
          subjectImpact[subjectId] = { periods: 0, classes: new Set() };
        }
        subjectImpact[subjectId].periods += affectedDays; // Approximate
        subjectImpact[subjectId].classes.add(entry.class?.toString());
      }
    });
  });
  
  return {
    affectedDays,
    totalLostPeriods,
    affectedClasses: affectedClasses.size,
    subjectImpact: Object.keys(subjectImpact).map(subjectId => ({
      subject: subjectId,
      lostPeriods: subjectImpact[subjectId].periods,
      affectedClasses: subjectImpact[subjectId].classes.size
    })),
    redistributionSuggestions: generateRedistributionSuggestions(semester, totalLostPeriods)
  };
}

// Generate redistribution suggestions
function generateRedistributionSuggestions(semester, lostPeriods) {
  const suggestions = [];
  
  if (semester.bufferSlots.enabled) {
    const bufferCapacity = semester.bufferSlots.slotsPerWeek * 4; // Assume 4 weeks buffer
    suggestions.push({
      type: 'buffer',
      capacity: Math.min(bufferCapacity, lostPeriods),
      description: `Use ${Math.min(bufferCapacity, lostPeriods)} buffer slots`
    });
  }
  
  if (semester.doublePeriods.enabled) {
    const doubleCapacity = Math.floor(lostPeriods / 2);
    suggestions.push({
      type: 'double',
      capacity: doubleCapacity,
      description: `Create ${doubleCapacity} double periods`
    });
  }
  
  if (semester.redistributionSettings.allowWeekendClasses) {
    suggestions.push({
      type: 'weekend',
      capacity: lostPeriods,
      description: 'Schedule weekend makeup classes'
    });
  }
  
  return suggestions;
}

// Auto-redistribute classes after holiday
router.post('/:id/redistribute', auth, async (req, res) => {
  try {
    const semester = await Semester.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!semester) return res.status(404).json({ message: 'Semester not found' });
    
    const { holidayId, strategy } = req.body; // strategy: 'buffer', 'double', 'weekend'
    
    // Get all timetables for this user
    const timetables = await Timetable.find({ createdBy: req.user.id })
      .populate('entries.class entries.subject entries.teacher entries.classroom');
    
    const redistributionResults = [];
    
    for (const timetable of timetables) {
      const result = await redistributeTimetable(timetable, semester, holidayId, strategy);
      redistributionResults.push(result);
    }
    
    res.json({
      message: 'Redistribution completed',
      results: redistributionResults
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Redistribute timetable entries
async function redistributeTimetable(timetable, semester, holidayId, strategy) {
  const holiday = semester.holidays.id(holidayId);
  if (!holiday) return { error: 'Holiday not found' };
  
  const redistributedEntries = [];
  const workingDays = semester.academicCalendar.weeklySchedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  // Find entries that fall on holiday dates
  const affectedEntries = timetable.entries.filter(entry => {
    return workingDays.includes(entry.day); // Simplified - would need actual date mapping
  });
  
  // Apply redistribution strategy
  switch (strategy) {
    case 'buffer':
      return redistributeToBufferSlots(timetable, affectedEntries, semester);
    case 'double':
      return redistributeToDoublePeriods(timetable, affectedEntries, semester);
    case 'weekend':
      return redistributeToWeekend(timetable, affectedEntries, semester);
    default:
      return { error: 'Invalid strategy' };
  }
}

// Redistribute to buffer slots
async function redistributeToBufferSlots(timetable, affectedEntries, semester) {
  const bufferDays = semester.bufferSlots.preferredDays || ['Friday'];
  const bufferPeriods = semester.bufferSlots.preferredPeriods || [7, 8];
  
  const redistributed = [];
  let bufferIndex = 0;
  
  for (const entry of affectedEntries) {
    if (bufferIndex < bufferDays.length * bufferPeriods.length) {
      const dayIndex = Math.floor(bufferIndex / bufferPeriods.length);
      const periodIndex = bufferIndex % bufferPeriods.length;
      
      const newEntry = {
        ...entry.toObject(),
        day: bufferDays[dayIndex],
        period: bufferPeriods[periodIndex],
        isRedistributed: true,
        redistributionType: 'buffer'
      };
      
      timetable.entries.push(newEntry);
      redistributed.push(newEntry);
      bufferIndex++;
    }
  }
  
  await timetable.save();
  return { redistributed, type: 'buffer' };
}

// Redistribute to double periods
async function redistributeToDoublePeriods(timetable, affectedEntries, semester) {
  const redistributed = [];
  
  // Group entries by subject and class
  const groupedEntries = {};
  affectedEntries.forEach(entry => {
    const key = `${entry.class}-${entry.subject}`;
    if (!groupedEntries[key]) groupedEntries[key] = [];
    groupedEntries[key].push(entry);
  });
  
  // Create double periods
  Object.values(groupedEntries).forEach(entries => {
    for (let i = 0; i < entries.length; i += 2) {
      if (i + 1 < entries.length) {
        // Find available consecutive periods
        const doubleEntry = {
          ...entries[i].toObject(),
          duration: 2, // Double period
          isRedistributed: true,
          redistributionType: 'double'
        };
        
        timetable.entries.push(doubleEntry);
        redistributed.push(doubleEntry);
      }
    }
  });
  
  await timetable.save();
  return { redistributed, type: 'double' };
}

// Get syllabus progress
router.get('/:id/progress', auth, async (req, res) => {
  try {
    const progress = await SyllabusProgress.find({ 
      semester: req.params.id,
      createdBy: req.user.id 
    }).populate('class subject teacher');
    
    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generate semester timetable with weekly scheduling
router.post('/:id/generate-timetable', auth, async (req, res) => {
  try {
    const semester = await Semester.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!semester) return res.status(404).json({ message: 'Semester not found' });

    console.log(`Starting semester timetable generation for: ${semester.name}`);

    // Get all required data
    const [classes, teachers, subjects, classrooms, timeslots] = await Promise.all([
      Class.find({ createdBy: req.user.id }).populate('subjects.subject subjects.teacher'),
      Teacher.find({ createdBy: req.user.id }),
      Subject.find({ createdBy: req.user.id }),
      Classroom.find({ createdBy: req.user.id }),
      Timeslot.find({ createdBy: req.user.id })
    ]);

    // Validate required data
    if (!timeslots.length) {
      return res.status(400).json({ message: 'No timeslot configuration found. Please create a timeslot configuration first.' });
    }
    if (!classes.length) {
      return res.status(400).json({ message: 'No classes found. Please create classes first.' });
    }
    if (!teachers.length) {
      return res.status(400).json({ message: 'No teachers found. Please create teachers first.' });
    }
    if (!classrooms.length) {
      return res.status(400).json({ message: 'No classrooms found. Please create classrooms first.' });
    }

    console.log('Data validation passed:', {
      classes: classes.length,
      teachers: teachers.length,
      subjects: subjects.length,
      classrooms: classrooms.length,
      timeslots: timeslots.length
    });

    // Initialize semester timetable generator
    const generator = new SemesterTimetableGenerator(
      semester, classes, teachers, subjects, classrooms, timeslots
    );

    // Generate complete semester timetable
    const result = await generator.generateSemesterTimetable();

    // Update semester status
    semester.status = 'active';
    await semester.save();

    console.log(`Semester timetable generation completed successfully for: ${semester.name}`);

    res.json({
      message: 'Semester timetable generated successfully',
      semester,
      ...result
    });
  } catch (err) {
    console.error('Semester timetable generation error:', {
      error: err.message,
      stack: err.stack,
      semesterId: req.params.id
    });
    res.status(500).json({ 
      message: `Timetable generation failed: ${err.message}`,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Get weekly timetables for a semester
router.get('/:id/weekly-timetables', auth, async (req, res) => {
  try {
    const weeklyTimetables = await WeeklyTimetable.find({ 
      semester: req.params.id,
      createdBy: req.user.id 
    })
    .populate('entries.class entries.subject entries.teacher entries.classroom')
    .sort('weekNumber');
    
    res.json(weeklyTimetables);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get specific week timetable
router.get('/:id/week/:weekNumber', auth, async (req, res) => {
  try {
    const weeklyTimetable = await WeeklyTimetable.findOne({
      semester: req.params.id,
      weekNumber: req.params.weekNumber,
      createdBy: req.user.id
    })
    .populate('entries.class entries.subject entries.teacher entries.classroom');
    
    if (!weeklyTimetable) {
      return res.status(404).json({ message: 'Weekly timetable not found' });
    }
    
    res.json(weeklyTimetable);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update week status (scheduled -> in_progress -> completed)
router.put('/:id/week/:weekNumber/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const weeklyTimetable = await WeeklyTimetable.findOneAndUpdate(
      {
        semester: req.params.id,
        weekNumber: req.params.weekNumber,
        createdBy: req.user.id
      },
      { status },
      { new: true }
    );
    
    if (!weeklyTimetable) {
      return res.status(404).json({ message: 'Weekly timetable not found' });
    }
    
    res.json(weeklyTimetable);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete semester
router.delete('/:id', auth, async (req, res) => {
  try {
    await Semester.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    await SyllabusProgress.deleteMany({ semester: req.params.id, createdBy: req.user.id });
    await WeeklyTimetable.deleteMany({ semester: req.params.id, createdBy: req.user.id });
    res.json({ message: 'Semester deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;