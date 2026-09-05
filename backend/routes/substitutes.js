const express = require('express');
const Substitute = require('../models/Substitute');
const Timetable = require('../models/Timetable');
const Teacher = require('../models/Teacher');
const Timeslot = require('../models/Timeslot');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all substitutes/swaps for current user
router.get('/', auth, async (req, res) => {
  const subs = await Substitute.find({ createdBy: req.user.id })
    .populate('originalEntry.class originalEntry.subject originalEntry.teacher originalEntry.classroom')
    .populate('substituteTeacher requestedBy swapWith.teacher approvedBy')
    .sort('-createdAt');
  res.json(subs);
});

// Find available substitute teachers for a specific slot
router.post('/find-substitute', auth, async (req, res) => {
  try {
    const { timetableId, day, period } = req.body;
    
    // Get the timetable to check existing assignments
    const timetable = await Timetable.findOne({ _id: timetableId, createdBy: req.user.id })
      .populate('entries.teacher');
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });
    
    // Find teachers already assigned at this slot
    const busyTeachers = timetable.entries
      .filter(e => e.day === day && e.period === period)
      .map(e => e.teacher?._id?.toString())
      .filter(Boolean);
    
    // Check for unavailable teachers due to approved unavailabilities
    const TeacherUnavailability = require('../models/TeacherUnavailability');
    const unavailabilities = await TeacherUnavailability.find({
      createdBy: req.user.id,
      status: 'approved',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });
    
    const unavailableTeachers = unavailabilities
      .filter(u => {
        if (u.isFullDay) return true;
        if (u.specificSlots && u.specificSlots.length > 0) {
          const daySlot = u.specificSlots.find(s => s.day === day);
          return daySlot && daySlot.periods.includes(period);
        }
        return true; // If no specific slots, assume full day
      })
      .map(u => u.teacher.toString());
    
    // Get all teachers and filter available ones
    const allTeachers = await Teacher.find({ createdBy: req.user.id });
    const available = allTeachers.filter(t => {
      const tid = t._id.toString();
      if (busyTeachers.includes(tid)) return false;
      if (unavailableTeachers.includes(tid)) return false;
      
      // Check teacher availability constraints
      if (t.availability && t.availability.length > 0) {
        const dayAvail = t.availability.find(a => a.day === day);
        if (dayAvail && !dayAvail.periods.includes(period)) return false;
      }
      
      return true;
    });
    
    res.json({ 
      available, 
      busyCount: busyTeachers.length,
      unavailableCount: unavailableTeachers.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create substitute assignment
router.post('/assign', auth, async (req, res) => {
  try {
    const { timetableId, originalEntry, substituteTeacher, isLibrary, reason } = req.body;
    
    // Get the timetable to find the actual entry
    const timetable = await Timetable.findOne({ _id: timetableId, createdBy: req.user.id })
      .populate('entries.class entries.subject entries.teacher entries.classroom');
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });
    
    // Find the actual timetable entry
    const actualEntry = timetable.entries.find(e => 
      e.day === originalEntry.day &&
      e.period === originalEntry.period &&
      (originalEntry.class ? e.class?._id?.toString() === originalEntry.class?.toString() : true) &&
      (originalEntry.teacher ? e.teacher?._id?.toString() === originalEntry.teacher?.toString() : true)
    );
    
    if (!actualEntry) {
      return res.status(400).json({ message: 'Could not find the specified timetable entry' });
    }
    
    const sub = await Substitute.create({
      timetableId,
      originalEntry: {
        day: actualEntry.day,
        period: actualEntry.period,
        class: actualEntry.class?._id,
        subject: actualEntry.subject?._id,
        teacher: actualEntry.teacher?._id,
        classroom: actualEntry.classroom?._id
      },
      type: 'substitute',
      substituteTeacher: isLibrary ? null : substituteTeacher,
      isLibrary,
      reason,
      status: 'approved', // Auto-approve substitutes
      createdBy: req.user.id
    });
    
    const populated = await Substitute.findById(sub._id)
      .populate('originalEntry.class originalEntry.subject originalEntry.teacher originalEntry.classroom')
      .populate('substituteTeacher');
    
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Create swap request
router.post('/swap-request', auth, async (req, res) => {
  try {
    const { timetableId, originalEntry, swapWith, requestedBy, reason } = req.body;
    
    // Get the timetable to find the actual entries
    const timetable = await Timetable.findOne({ _id: timetableId, createdBy: req.user.id })
      .populate('entries.class entries.subject entries.teacher entries.classroom');
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });
    
    // Find the actual timetable entries for both slots
    const entry1 = timetable.entries.find(e => 
      e.day === originalEntry.day &&
      e.period === originalEntry.period &&
      e.teacher?._id?.toString() === originalEntry.teacher?.toString()
    );
    
    const entry2 = timetable.entries.find(e => 
      e.day === swapWith.day &&
      e.period === swapWith.period &&
      e.teacher?._id?.toString() === swapWith.teacher?.toString()
    );
    
    if (!entry1 || !entry2) {
      return res.status(400).json({ message: 'Could not find the specified timetable entries' });
    }
    
    const swap = await Substitute.create({
      timetableId,
      originalEntry: {
        day: entry1.day,
        period: entry1.period,
        class: entry1.class?._id,
        subject: entry1.subject?._id,
        teacher: entry1.teacher?._id,
        classroom: entry1.classroom?._id
      },
      type: 'swap',
      swapWith: {
        day: entry2.day,
        period: entry2.period,
        teacher: entry2.teacher?._id
      },
      requestedBy,
      reason,
      status: 'pending', // Swaps need approval
      createdBy: req.user.id
    });
    
    const populated = await Substitute.findById(swap._id)
      .populate('originalEntry.class originalEntry.subject originalEntry.teacher originalEntry.classroom')
      .populate('requestedBy swapWith.teacher');
    
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Approve/reject swap
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    
    const sub = await Substitute.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { status, approvedBy: req.user.id },
      { new: true }
    ).populate('originalEntry.class originalEntry.subject originalEntry.teacher originalEntry.classroom')
     .populate('substituteTeacher requestedBy swapWith.teacher approvedBy');
    
    if (!sub) return res.status(404).json({ message: 'Not found' });
    res.json(sub);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete substitute/swap
router.delete('/:id', auth, async (req, res) => {
  await Substitute.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
  res.json({ message: 'Deleted' });
});

// Get timetable with substitutions applied
router.get('/timetable/:id', auth, async (req, res) => {
  try {
    const timetable = await Timetable.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('entries.class entries.subject entries.teacher entries.classroom');
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });

    const substitutes = await Substitute.find({ 
      timetableId: req.params.id, 
      status: 'approved' 
    }).populate('substituteTeacher originalEntry.teacher originalEntry.class originalEntry.subject originalEntry.classroom swapWith.teacher');

    const timeslot = await Timeslot.findOne({ createdBy: req.user.id });
    
    console.log('Backend: Timetable entries:', timetable.entries.length);
    console.log('Backend: Found substitutes:', substitutes.length);
    
    // Apply substitutions and swaps to create the updated timetable
    let updatedEntries = timetable.entries.map(e => (e.toObject ? e.toObject() : { ...e }));
    
    substitutes.forEach((sub, i) => {
      console.log(`Backend: Processing substitute ${i}:`, {
        type: sub.type,
        day: sub.originalEntry?.day,
        period: sub.originalEntry?.period,
        classId: sub.originalEntry?.class?._id || sub.originalEntry?.class,
        teacherId: sub.originalEntry?.teacher?._id || sub.originalEntry?.teacher,
        substituteTeacher: sub.substituteTeacher?.name,
        swapWith: sub.swapWith,
        status: sub.status
      });
      
      if (sub.type === 'substitute') {
        // Handle substitute assignments
        const entryIndex = updatedEntries.findIndex(entry => 
          entry.day === sub.originalEntry.day &&
          entry.period === sub.originalEntry.period &&
          entry.class?._id?.toString() === (sub.originalEntry.class?._id || sub.originalEntry.class)?.toString() &&
          entry.teacher?._id?.toString() === (sub.originalEntry.teacher?._id || sub.originalEntry.teacher)?.toString()
        );
        
        if (entryIndex !== -1) {
          if (sub.isLibrary) {
            updatedEntries[entryIndex] = {
              ...updatedEntries[entryIndex],
              subject: { name: 'Library', _id: 'library' },
              teacher: { name: 'Library Period', _id: 'library' },
              isSubstitute: true
            };
          } else if (sub.substituteTeacher) {
            updatedEntries[entryIndex] = {
              ...updatedEntries[entryIndex],
              teacher: sub.substituteTeacher,
              isSubstitute: true
            };
          }
        }
      } else if (sub.type === 'swap') {
        // Handle teacher swaps
        const entry1Index = updatedEntries.findIndex(entry => 
          entry.day === sub.originalEntry.day &&
          entry.period === sub.originalEntry.period &&
          entry.teacher?._id?.toString() === (sub.originalEntry.teacher?._id || sub.originalEntry.teacher)?.toString()
        );
        
        const entry2Index = updatedEntries.findIndex(entry => 
          entry.day === sub.swapWith.day &&
          entry.period === sub.swapWith.period &&
          entry.teacher?._id?.toString() === (sub.swapWith.teacher?._id || sub.swapWith.teacher)?.toString()
        );
        
        if (entry1Index !== -1 && entry2Index !== -1) {
          // Swap the teachers
          const temp = updatedEntries[entry1Index].teacher;
          updatedEntries[entry1Index] = {
            ...updatedEntries[entry1Index],
            teacher: updatedEntries[entry2Index].teacher,
            isSwapped: true
          };
          updatedEntries[entry2Index] = {
            ...updatedEntries[entry2Index],
            teacher: temp,
            isSwapped: true
          };
        }
      }
    });
    
    res.json({
      ...timetable.toObject(),
      entries: updatedEntries,
      substitutes,
      days: timeslot?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      periods: timeslot?.periods || []
    });
  } catch (err) {
    console.error('Backend error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;