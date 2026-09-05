const express = require('express');
const auth = require('../middleware/auth');
const Timetable = require('../models/Timetable');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Classroom = require('../models/Classroom');
const Timeslot = require('../models/Timeslot');
const { runGA } = require('../utils/geneticAlgorithm');
const router = express.Router();

// Seed realistic sample demo data for current user
router.post('/seed-sample-data', auth, async (req, res) => {
  try {
    const { seedDataForUser } = require('../scripts/seedData');
    const result = await seedDataForUser(req.user.id);
    res.json({ message: 'Sample demo data seeded successfully', data: result });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Generate timetable
router.post('/generate', auth, async (req, res) => {
  try {
    const { constraints = {}, classId } = req.body;
    const uid = req.user.id;

    // Build query for classes
    const classQuery = { createdBy: uid };
    if (classId) classQuery._id = classId;

    let [classes, teachers, classrooms, timeslots] = await Promise.all([
      Class.find(classQuery).populate('subjects.subject subjects.teacher'),
      Teacher.find({ createdBy: uid }),
      Classroom.find({ createdBy: uid }),
      Timeslot.find({ createdBy: uid })
    ]);

    if (!timeslots.length) return res.status(400).json({ message: 'No timeslot configuration found. Please save a configuration in Time Slots.' });
    if (!classes.length) return res.status(400).json({ message: classId ? 'Selected class not found' : 'No classes found. Please add a class in Classes.' });
    if (!teachers.length) return res.status(400).json({ message: 'No teachers found. Please add at least one teacher.' });

    // Auto-create default classroom if none exists
    if (!classrooms.length) {
      const defaultRoom = await Classroom.create({
        name: 'Room 101',
        capacity: 60,
        isLab: false,
        building: 'Main Block',
        createdBy: uid
      });
      classrooms = [defaultRoom];
      console.log(`Auto-created default classroom 'Room 101' for user ${uid}`);
    }

    // Check for unassigned teachers in classes
    for (const cls of classes) {
      if (!cls.subjects || cls.subjects.length === 0) continue;
      for (const s of cls.subjects) {
        if (s.subject && !s.teacher) {
          if (teachers.length === 1) {
            s.teacher = teachers[0];
            await Class.updateOne(
              { _id: cls._id, 'subjects._id': s._id },
              { $set: { 'subjects.$.teacher': teachers[0]._id } }
            );
            console.log(`Auto-assigned single teacher ${teachers[0].name} to class ${cls.name}`);
          } else {
            return res.status(400).json({
              message: `Class "${cls.name}${cls.section ? ` - ${cls.section}` : ''}" has subject "${s.subject?.name || 'Subject'}" with no teacher assigned. Please edit the class and assign a teacher.`
            });
          }
        }
      }
    }

    const timeslotConfig = timeslots[0];
    console.log(`Starting GA for user ${uid} with ${classes.length} classes and ${teachers.length} teachers`);
    
    const { chromosome, fitnessScore, generation } = runGA(classes, teachers, classrooms, timeslotConfig, constraints);

    const entries = chromosome.map(gene => ({
      day: gene.day,
      period: gene.period,
      class: gene.classId,
      subject: gene.subjectId,
      teacher: gene.teacherId,
      classroom: gene.classroomId
    }));

    // Validate entries for null IDs which cause Mongoose validation errors
    const invalidEntries = entries.filter(e => !e.class || !e.subject || !e.teacher || !e.classroom);
    if (invalidEntries.length > 0) {
      console.error('Invalid entries found:', invalidEntries.length);
      return res.status(400).json({ 
        message: 'Generation produced invalid assignments. Please ensure all classes have teachers and subjects assigned, and all subjects have valid hours.' 
      });
    }

    const timetableName = classId && classes.length === 1 
      ? `${classes[0].name}${classes[0].section ? ` - ${classes[0].section}` : ''} Timetable`
      : 'Generated Timetable';

    const timetable = await Timetable.create({
      name: timetableName,
      entries,
      fitnessScore: Math.round(fitnessScore * 100),
      generation,
      constraints,
      status: 'completed',
      createdBy: uid
    });

    const populated = await Timetable.findById(timetable._id)
      .populate('entries.class entries.subject entries.teacher entries.classroom');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all timetables for current user
router.get('/', auth, async (req, res) => {
  const timetables = await Timetable.find({ createdBy: req.user.id }).select('-entries').sort('-createdAt');
  res.json(timetables);
});

// Get single timetable — only if owned by current user
router.get('/:id', auth, async (req, res) => {
  try {
    const tt = await Timetable.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('entries.class entries.subject entries.teacher entries.classroom');
    if (!tt) return res.status(404).json({ message: 'Not found' });
    res.json(tt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update timetable name
router.put('/:id/name', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const timetable = await Timetable.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { name: name.trim() },
      { new: true }
    );
    
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });
    res.json({ name: timetable.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update timetable entries
router.put('/:id/entries', auth, async (req, res) => {
  try {
    const { changes } = req.body;
    if (!changes || !Array.isArray(changes)) {
      return res.status(400).json({ message: 'Changes array is required' });
    }
    
    const timetable = await Timetable.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });
    
    // Apply changes to entries
    const updatedEntries = timetable.entries.map(entry => {
      const change = changes.find(c => c.entryId === entry._id.toString());
      if (change) {
        return {
          ...entry,
          day: change.newDay,
          period: change.newPeriod
        };
      }
      return entry;
    });
    
    // Update the timetable
    timetable.entries = updatedEntries;
    await timetable.save();
    
    const populated = await Timetable.findById(timetable._id)
      .populate('entries.class entries.subject entries.teacher entries.classroom');
    
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete timetable
router.delete('/:id', auth, async (req, res) => {
  await Timetable.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
  res.json({ message: 'Deleted' });
});

// Teacher dashboard
router.get('/:id/teacher-dashboard', auth, async (req, res) => {
  try {
    const tt = await Timetable.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('entries.teacher entries.subject entries.class');
    if (!tt) return res.status(404).json({ message: 'Not found' });

    const dashboard = {};
    for (const entry of tt.entries) {
      const tid = entry.teacher?._id?.toString();
      if (!tid) continue;
      if (!dashboard[tid]) {
        dashboard[tid] = { teacher: entry.teacher, totalLectures: 0, byDay: {}, subjects: new Set() };
      }
      dashboard[tid].totalLectures++;
      dashboard[tid].byDay[entry.day] = (dashboard[tid].byDay[entry.day] || 0) + 1;
      if (entry.subject) dashboard[tid].subjects.add(entry.subject.name);
    }

    res.json(Object.values(dashboard).map(d => ({ ...d, subjects: [...d.subjects] })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
