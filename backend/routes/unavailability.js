const express = require('express');
const TeacherUnavailability = require('../models/TeacherUnavailability');
const Teacher = require('../models/Teacher');
const Timetable = require('../models/Timetable');
const Substitute = require('../models/Substitute');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all unavailability records
router.get('/', auth, async (req, res) => {
  const unavailabilities = await TeacherUnavailability.find({ createdBy: req.user.id })
    .populate('teacher approvedBy')
    .sort('-createdAt');
  res.json(unavailabilities);
});

// Create unavailability record
router.post('/', auth, async (req, res) => {
  try {
    const unavailability = await TeacherUnavailability.create({
      ...req.body,
      createdBy: req.user.id
    });
    
    const populated = await TeacherUnavailability.findById(unavailability._id)
      .populate('teacher approvedBy');
    
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update unavailability status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const unavailability = await TeacherUnavailability.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { status, approvedBy: req.user.id },
      { new: true }
    ).populate('teacher approvedBy');
    
    if (!unavailability) return res.status(404).json({ message: 'Not found' });
    res.json(unavailability);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Check conflicts for a specific timetable
router.post('/check-conflicts', auth, async (req, res) => {
  try {
    const { timetableId, startDate, endDate, relevantDays } = req.body;
    
    const timetable = await Timetable.findOne({ _id: timetableId, createdBy: req.user.id })
      .populate('entries.teacher entries.class entries.subject');
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });
    
    const unavailabilities = await TeacherUnavailability.find({
      createdBy: req.user.id,
      status: 'approved',
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
      ]
    }).populate('teacher');
    
    const conflicts = [];
    
    // Filter timetable entries to only check relevant days
    const relevantEntries = relevantDays && relevantDays.length > 0 
      ? timetable.entries.filter(entry => relevantDays.includes(entry.day))
      : timetable.entries;
    
    // Check each relevant timetable entry against unavailabilities
    for (const entry of relevantEntries) {
      if (!entry.teacher) continue;
      
      const teacherUnavailabilities = unavailabilities.filter(u => 
        u.teacher._id.toString() === entry.teacher._id.toString()
      );
      
      for (const unavail of teacherUnavailabilities) {
        // Check if the unavailability period overlaps with our date range
        const unavailStart = new Date(unavail.startDate);
        const unavailEnd = new Date(unavail.endDate);
        const checkStart = new Date(startDate);
        const checkEnd = new Date(endDate);
        
        if (unavailStart <= checkEnd && unavailEnd >= checkStart) {
          const conflict = {
            entry,
            unavailability: unavail,
            conflictType: unavail.type,
            needsSubstitute: true
          };
          
          // Check if specific slots conflict or if it's full day
          if (unavail.isFullDay) {
            conflicts.push(conflict);
          } else if (unavail.specificSlots && unavail.specificSlots.length > 0) {
            const daySlot = unavail.specificSlots.find(s => s.day === entry.day);
            if (daySlot && daySlot.periods.includes(entry.period)) {
              conflicts.push(conflict);
            }
          } else {
            // If no specific slots, assume full day conflict
            conflicts.push(conflict);
          }
        }
      }
    }
    
    res.json({ 
      conflicts, 
      totalConflicts: conflicts.length,
      checkedDays: relevantDays || [],
      dateRange: { startDate, endDate }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Auto-assign substitutes for conflicts
router.post('/auto-assign-substitutes', auth, async (req, res) => {
  try {
    const { timetableId, conflicts } = req.body;
    
    const assignments = [];
    
    for (const conflict of conflicts) {
      // Find available substitute teachers
      const availableTeachers = await Teacher.find({ 
        createdBy: req.user.id,
        _id: { $ne: conflict.entry.teacher }
      });
      
      // Simple logic: assign first available teacher or library period
      const substituteTeacher = availableTeachers[0];
      
      const substitute = await Substitute.create({
        timetableId,
        originalEntry: {
          day: conflict.entry.day,
          period: conflict.entry.period,
          class: conflict.entry.class,
          subject: conflict.entry.subject,
          teacher: conflict.entry.teacher,
          classroom: conflict.entry.classroom
        },
        type: 'substitute',
        substituteTeacher: substituteTeacher?._id || null,
        isLibrary: !substituteTeacher,
        reason: `${conflict.unavailability.type}: ${conflict.unavailability.reason}`,
        status: 'approved',
        createdBy: req.user.id
      });
      
      assignments.push(substitute);
    }
    
    res.json({ 
      message: `Auto-assigned ${assignments.length} substitutes`,
      assignments 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete unavailability
router.delete('/:id', auth, async (req, res) => {
  await TeacherUnavailability.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
  res.json({ message: 'Deleted' });
});

module.exports = router;