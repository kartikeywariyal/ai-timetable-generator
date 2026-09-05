const WeeklyTimetable = require('../models/WeeklyTimetable');
const Semester = require('../models/Semester');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const Timeslot = require('../models/Timeslot');
const { runGA } = require('./geneticAlgorithm');

class SemesterTimetableGenerator {
  constructor(semester, classes, teachers, subjects, classrooms, timeslots) {
    this.semester = semester;
    this.classes = classes;
    this.teachers = teachers;
    this.subjects = subjects;
    this.classrooms = classrooms;
    this.timeslots = timeslots[0]; // Use the first timeslot config
    this.workingDays = this.timeslots.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    this.compensationDay = 'Saturday';
    
    console.log('SemesterTimetableGenerator initialized:', {
      semester: semester.name,
      classes: classes.length,
      teachers: teachers.length,
      classrooms: classrooms.length,
      timeslotDays: this.timeslots.days?.length,
      timeslotPeriods: this.timeslots.periods?.length
    });
  }

  // Generate complete semester timetable week by week
  async generateSemesterTimetable() {
    const weeks = this.generateWeekRanges();
    const weeklyTimetables = [];
    const missedClasses = []; // Track classes missed due to holidays

    console.log(`Generating timetable for ${weeks.length} weeks`);

    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];
      const weekNumber = i + 1;
      
      console.log(`Processing Week ${weekNumber}: ${week.start.toDateString()} - ${week.end.toDateString()}`);
      
      // Check for holidays in this week
      const holidaysInWeek = this.getHolidaysInWeek(week);
      
      // Generate base timetable for the week
      const baseSchedule = this.generateWeeklySchedule(weekNumber);
      const fitnessScore = baseSchedule.fitnessScore || 0;
      
      // Remove classes that fall on holidays
      const { validEntries, missedEntries } = this.filterHolidayClashes(baseSchedule.entries, holidaysInWeek, week);
      
      // Add missed classes to compensation queue
      missedClasses.push(...missedEntries.map(entry => ({
        ...entry,
        originalWeek: weekNumber,
        compensationReason: holidaysInWeek.join(', ')
      })));
      
      // Try to compensate missed classes within the same week
      const compensatedEntries = this.compensateWithinWeek(validEntries, missedEntries, week);
      
      // Create weekly timetable
      const weeklyTimetable = await WeeklyTimetable.create({
        semester: this.semester._id,
        weekNumber,
        weekStartDate: week.start,
        weekEndDate: week.end,
        entries: compensatedEntries,
        holidaysInWeek: holidaysInWeek,
        compensationsMade: compensatedEntries.filter(e => e.isCompensation).length,
        fitnessScore: fitnessScore,
        createdBy: this.semester.createdBy
      });

      weeklyTimetables.push(weeklyTimetable);
    }

    // Handle remaining missed classes with Saturday compensation
    if (missedClasses.length > 0) {
      await this.scheduleSaturdayCompensation(weeklyTimetables, missedClasses);
    }

    // Calculate syllabus progress for each week
    await this.calculateSyllabusProgress(weeklyTimetables);

    return {
      weeklyTimetables,
      totalWeeks: weeks.length,
      totalMissedClasses: missedClasses.length,
      compensationStrategy: 'Saturday classes and redistribution'
    };
  }

  // Generate week ranges for the entire semester
  generateWeekRanges() {
    const weeks = [];
    const start = new Date(this.semester.startDate);
    const end = new Date(this.semester.endDate);
    
    // Start from the first Monday of the semester
    const firstMonday = new Date(start);
    while (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() + 1);
    }

    let currentWeekStart = new Date(firstMonday);
    
    while (currentWeekStart <= end) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
      
      // Don't go beyond semester end
      if (weekEnd > end) {
        weekEnd.setTime(end.getTime());
      }
      
      weeks.push({
        start: new Date(currentWeekStart),
        end: new Date(weekEnd)
      });
      
      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return weeks;
  }

  // Generate base weekly schedule using hybrid approach (GA + fallback optimization)
  generateWeeklySchedule(weekNumber) {
    console.log(`Generating schedule for week ${weekNumber} using hybrid GA + optimization approach`);
    
    // Validate required data
    if (!this.classes || this.classes.length === 0) {
      throw new Error('No classes available for timetable generation');
    }
    if (!this.teachers || this.teachers.length === 0) {
      throw new Error('No teachers available for timetable generation');
    }
    if (!this.classrooms || this.classrooms.length === 0) {
      throw new Error('No classrooms available for timetable generation');
    }
    if (!this.timeslots || !this.timeslots.days || !this.timeslots.periods) {
      throw new Error('Invalid timeslot configuration');
    }
    
    console.log('Hybrid approach input validation passed:', {
      classes: this.classes.length,
      teachers: this.teachers.length,
      classrooms: this.classrooms.length,
      days: this.timeslots.days.length,
      periods: this.timeslots.periods.length
    });
    
    let bestResult = null;
    let bestFitness = 0;
    
    // Strategy 1: Primary Genetic Algorithm (High-intensity)
    try {
      console.log('Attempting primary GA with high intensity...');
      const primaryGA = runGA(
        this.classes,
        this.teachers,
        this.classrooms,
        this.timeslots,
        {
          populationSize: 100,
          maxGenerations: 200,
          mutationRate: 0.08,
          crossoverRate: 0.85
        }
      );
      
      if (primaryGA && primaryGA.chromosome && primaryGA.fitnessScore > bestFitness) {
        bestResult = primaryGA;
        bestFitness = primaryGA.fitnessScore;
        console.log(`Primary GA achieved fitness: ${Math.round(bestFitness * 100)}%`);
      }
    } catch (error) {
      console.warn('Primary GA failed:', error.message);
    }
    
    // Strategy 2: Secondary Genetic Algorithm (Balanced)
    if (bestFitness < 0.8) {
      try {
        console.log('Attempting secondary GA with balanced parameters...');
        const secondaryGA = runGA(
          this.classes,
          this.teachers,
          this.classrooms,
          this.timeslots,
          {
            populationSize: 75,
            maxGenerations: 150,
            mutationRate: 0.12,
            crossoverRate: 0.8
          }
        );
        
        if (secondaryGA && secondaryGA.chromosome && secondaryGA.fitnessScore > bestFitness) {
          bestResult = secondaryGA;
          bestFitness = secondaryGA.fitnessScore;
          console.log(`Secondary GA achieved better fitness: ${Math.round(bestFitness * 100)}%`);
        }
      } catch (error) {
        console.warn('Secondary GA failed:', error.message);
      }
    }
    
    // Strategy 3: Quick Genetic Algorithm (Fast)
    if (bestFitness < 0.6) {
      try {
        console.log('Attempting quick GA with fast parameters...');
        const quickGA = runGA(
          this.classes,
          this.teachers,
          this.classrooms,
          this.timeslots,
          {
            populationSize: 50,
            maxGenerations: 100,
            mutationRate: 0.15,
            crossoverRate: 0.75
          }
        );
        
        if (quickGA && quickGA.chromosome && quickGA.fitnessScore > bestFitness) {
          bestResult = quickGA;
          bestFitness = quickGA.fitnessScore;
          console.log(`Quick GA achieved better fitness: ${Math.round(bestFitness * 100)}%`);
        }
      } catch (error) {
        console.warn('Quick GA failed:', error.message);
      }
    }
    
    // Strategy 4: Intelligent Fallback (Optimized Manual Scheduling)
    if (bestFitness < 0.5) {
      console.log('All GA attempts below threshold, using intelligent fallback...');
      const fallbackResult = this.generateIntelligentFallback(weekNumber);
      if (fallbackResult.fitnessScore > bestFitness) {
        bestResult = {
          chromosome: fallbackResult.entries.map(entry => ({
            day: entry.day,
            period: entry.period,
            classId: entry.class,
            subjectId: entry.subject,
            teacherId: entry.teacher,
            classroomId: entry.classroom
          })),
          fitnessScore: fallbackResult.fitnessScore / 100
        };
        bestFitness = fallbackResult.fitnessScore / 100;
        console.log(`Intelligent fallback achieved fitness: ${fallbackResult.fitnessScore}%`);
      }
    }
    
    if (!bestResult || !bestResult.chromosome) {
      throw new Error('All optimization strategies failed to generate a valid timetable');
    }
    
    // Convert best result to weekly format
    const entries = bestResult.chromosome.map(gene => ({
      day: gene.day,
      period: gene.period,
      class: gene.classId,
      subject: gene.subjectId,
      teacher: gene.teacherId,
      classroom: gene.classroomId,
      isCompensation: false,
      isDoubleClass: false,
      isSaturdayClass: false
    }));
    
    const finalFitness = Math.round(bestFitness * 100);
    
    // Post-processing optimization
    if (finalFitness < 95) {
      console.log('Applying post-processing optimization...');
      const optimizedEntries = this.postProcessOptimization(entries);
      const optimizedFitness = this.calculateFallbackFitness(optimizedEntries);
      
      if (optimizedFitness > finalFitness) {
        console.log(`Post-processing improved fitness from ${finalFitness}% to ${optimizedFitness}%`);
        return {
          entries: optimizedEntries,
          fitnessScore: optimizedFitness
        };
      }
    }
    
    console.log(`Week ${weekNumber} final result: ${entries.length} entries with ${finalFitness}% fitness`);
    
    return {
      entries: entries,
      fitnessScore: finalFitness
    };
  }
  
  // Intelligent fallback with optimization techniques
  generateIntelligentFallback(weekNumber) {
    console.log(`Generating intelligent fallback schedule for week ${weekNumber}`);
    
    const entries = [];
    const periods = this.timeslots.periods.filter(p => !p.isBreak);
    const occupiedSlots = new Map(); // Track occupied slots: "day-period" -> { teacher, classroom, class }
    
    // Priority-based scheduling
    const classSubjects = [];
    
    // Build priority list (core subjects first, then electives)
    for (const cls of this.classes) {
      if (!cls.subjects) continue;
      for (const subjectAssignment of cls.subjects) {
        if (!subjectAssignment || !subjectAssignment.subject || !subjectAssignment.teacher) continue;
        const subject = subjectAssignment.subject;
        const teacher = subjectAssignment.teacher;
        const hoursPerWeek = subject.hoursPerWeek || 3;
        
        // Priority scoring (higher = more important)
        let priority = 100;
        if (subject.name.toLowerCase().includes('math')) priority += 50;
        if (subject.name.toLowerCase().includes('english')) priority += 45;
        if (subject.name.toLowerCase().includes('science')) priority += 40;
        if (subject.name.toLowerCase().includes('physics')) priority += 35;
        if (subject.name.toLowerCase().includes('chemistry')) priority += 35;
        if (subject.isLab) priority += 20; // Labs need special handling
        
        for (let h = 0; h < hoursPerWeek; h++) {
          classSubjects.push({
            class: cls,
            subject: subject,
            teacher: teacher,
            priority: priority,
            isLab: subject.isLab,
            hour: h
          });
        }
      }
    }
    
    // Sort by priority (highest first)
    classSubjects.sort((a, b) => b.priority - a.priority);
    
    console.log(`Scheduling ${classSubjects.length} class-subject assignments by priority`);
    
    // Schedule each class-subject assignment
    for (const assignment of classSubjects) {
      let scheduled = false;
      
      // Try to find the best available slot
      for (const day of this.workingDays) {
        if (scheduled) break;
        
        for (const period of periods) {
          const slotKey = `${day}-${period.periodNumber}`;
          const slot = occupiedSlots.get(slotKey) || { teachers: new Set(), classrooms: new Set(), classes: new Set() };
          
          // Check conflicts
          const hasTeacherConflict = slot.teachers.has(assignment.teacher._id.toString());
          const hasClassConflict = slot.classes.has(assignment.class._id.toString());
          
          // Find available classroom
          const availableClassroom = this.findBestClassroom(assignment, slot.classrooms);
          
          if (!hasTeacherConflict && !hasClassConflict && availableClassroom) {
            // Check teacher availability
            if (this.isTeacherAvailable(assignment.teacher, day, period.periodNumber)) {
              // Schedule this assignment
              entries.push({
                day: day,
                period: period.periodNumber,
                class: assignment.class._id,
                subject: assignment.subject._id,
                teacher: assignment.teacher._id,
                classroom: availableClassroom._id,
                isCompensation: false,
                isDoubleClass: false,
                isSaturdayClass: false
              });
              
              // Update occupied slots
              slot.teachers.add(assignment.teacher._id.toString());
              slot.classrooms.add(availableClassroom._id.toString());
              slot.classes.add(assignment.class._id.toString());
              occupiedSlots.set(slotKey, slot);
              
              scheduled = true;
              break;
            }
          }
        }
      }
      
      if (!scheduled) {
        console.warn(`Could not schedule: ${assignment.class.name} - ${assignment.subject.name} with ${assignment.teacher.name}`);
      }
    }
    
    // Calculate fitness score for fallback
    const fitnessScore = this.calculateFallbackFitness(entries);
    
    console.log(`Intelligent fallback generated ${entries.length} entries with ${fitnessScore}% fitness`);
    
    return {
      entries: entries,
      fitnessScore: fitnessScore
    };
  }
  
  // Find best available classroom for an assignment
  findBestClassroom(assignment, occupiedClassrooms) {
    // Prefer lab classrooms for lab subjects
    if (assignment.isLab) {
      const labClassroom = this.classrooms.find(room => 
        room.isLab && 
        room.capacity >= (assignment.class.strength || 30) &&
        !occupiedClassrooms.has(room._id.toString())
      );
      if (labClassroom) return labClassroom;
    }
    
    // Find regular classroom with sufficient capacity
    return this.classrooms.find(room => 
      !room.isLab && 
      room.capacity >= (assignment.class.strength || 30) &&
      !occupiedClassrooms.has(room._id.toString())
    );
  }
  
  // Check if teacher is available at specific time
  isTeacherAvailable(teacher, day, period) {
    if (!teacher.availability || teacher.availability.length === 0) {
      return true; // No restrictions
    }
    
    const dayAvailability = teacher.availability.find(av => av.day === day);
    if (!dayAvailability) return false;
    
    return dayAvailability.periods.includes(period);
  }
  
  // Calculate fitness score for fallback method
  calculateFallbackFitness(entries) {
    if (entries.length === 0) return 0;
    
    let conflicts = 0;
    const totalEntries = entries.length;
    
    // Check for conflicts
    const teacherSlots = new Map();
    const classSlots = new Map();
    const roomSlots = new Map();
    
    for (const entry of entries) {
      const slotKey = `${entry.day}-${entry.period}`;
      
      // Teacher conflicts
      const teacherKey = entry.teacher.toString();
      if (!teacherSlots.has(teacherKey)) teacherSlots.set(teacherKey, new Set());
      if (teacherSlots.get(teacherKey).has(slotKey)) conflicts++;
      else teacherSlots.get(teacherKey).add(slotKey);
      
      // Class conflicts
      const classKey = entry.class.toString();
      if (!classSlots.has(classKey)) classSlots.set(classKey, new Set());
      if (classSlots.get(classKey).has(slotKey)) conflicts++;
      else classSlots.get(classKey).add(slotKey);
      
      // Room conflicts
      const roomKey = entry.classroom.toString();
      if (!roomSlots.has(roomKey)) roomSlots.set(roomKey, new Set());
      if (roomSlots.get(roomKey).has(slotKey)) conflicts++;
      else roomSlots.get(roomKey).add(slotKey);
    }
    
    // Calculate fitness (0-100)
    const conflictPenalty = (conflicts / totalEntries) * 100;
    const fitness = Math.max(0, 100 - conflictPenalty);
    
    return fitness;
  }
  // Post-processing optimization to improve timetable quality
  postProcessOptimization(entries) {
    console.log('Starting post-processing optimization...');
    
    let optimizedEntries = [...entries];
    let improved = true;
    let iterations = 0;
    const maxIterations = 10;
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      console.log(`Post-processing iteration ${iterations}`);
      
      // Strategy 1: Resolve teacher conflicts by swapping
      const teacherConflicts = this.findTeacherConflicts(optimizedEntries);
      if (teacherConflicts.length > 0) {
        console.log(`Resolving ${teacherConflicts.length} teacher conflicts...`);
        const resolved = this.resolveTeacherConflicts(optimizedEntries, teacherConflicts);
        if (resolved.length !== optimizedEntries.length || this.hasImprovements(optimizedEntries, resolved)) {
          optimizedEntries = resolved;
          improved = true;
        }
      }
      
      // Strategy 2: Optimize classroom assignments
      const optimizedRooms = this.optimizeClassroomAssignments(optimizedEntries);
      if (this.hasImprovements(optimizedEntries, optimizedRooms)) {
        optimizedEntries = optimizedRooms;
        improved = true;
      }
      
      // Strategy 3: Balance teacher workload across days
      const balancedWorkload = this.balanceTeacherWorkload(optimizedEntries);
      if (this.hasImprovements(optimizedEntries, balancedWorkload)) {
        optimizedEntries = balancedWorkload;
        improved = true;
      }
    }
    
    console.log(`Post-processing completed after ${iterations} iterations`);
    return optimizedEntries;
  }
  
  // Find teacher conflicts in the timetable
  findTeacherConflicts(entries) {
    const conflicts = [];
    const teacherSlots = new Map();
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const slotKey = `${entry.day}-${entry.period}`;
      const teacherId = entry.teacher.toString();
      
      if (!teacherSlots.has(teacherId)) {
        teacherSlots.set(teacherId, new Map());
      }
      
      const teacherSchedule = teacherSlots.get(teacherId);
      if (teacherSchedule.has(slotKey)) {
        conflicts.push({
          entry1Index: teacherSchedule.get(slotKey),
          entry2Index: i,
          teacherId: teacherId,
          slot: slotKey
        });
      } else {
        teacherSchedule.set(slotKey, i);
      }
    }
    
    return conflicts;
  }
  
  // Resolve teacher conflicts by finding alternative slots
  resolveTeacherConflicts(entries, conflicts) {
    const resolvedEntries = [...entries];
    const periods = this.timeslots.periods.filter(p => !p.isBreak);
    
    for (const conflict of conflicts) {
      const conflictEntry = resolvedEntries[conflict.entry2Index];
      let resolved = false;
      
      // Try to find an alternative slot for the conflicting entry
      for (const day of this.workingDays) {
        if (resolved) break;
        
        for (const period of periods) {
          const newSlotKey = `${day}-${period.periodNumber}`;
          
          // Check if this slot is free for the teacher and class
          const hasConflict = resolvedEntries.some((entry, index) => {
            if (index === conflict.entry2Index) return false;
            
            const entrySlot = `${entry.day}-${entry.period}`;
            if (entrySlot !== newSlotKey) return false;
            
            return entry.teacher.toString() === conflictEntry.teacher.toString() ||
                   entry.class.toString() === conflictEntry.class.toString();
          });
          
          if (!hasConflict) {
            // Move the conflicting entry to this slot
            resolvedEntries[conflict.entry2Index] = {
              ...conflictEntry,
              day: day,
              period: period.periodNumber
            };
            resolved = true;
            break;
          }
        }
      }
      
      if (!resolved) {
        console.warn(`Could not resolve teacher conflict for entry ${conflict.entry2Index}`);
      }
    }
    
    return resolvedEntries;
  }
  
  // Optimize classroom assignments for better utilization
  optimizeClassroomAssignments(entries) {
    const optimizedEntries = entries.map(entry => {
      const currentClassroom = this.classrooms.find(room => room._id.toString() === entry.classroom.toString());
      const cls = this.classes.find(c => c._id.toString() === entry.class.toString());
      const subject = this.subjects.find(s => s._id.toString() === entry.subject.toString());
      
      if (!currentClassroom || !cls || !subject) return entry;
      
      // Find a better classroom if available
      const betterClassroom = this.findOptimalClassroom(entry, cls, subject, entries);
      
      if (betterClassroom && betterClassroom._id.toString() !== currentClassroom._id.toString()) {
        return {
          ...entry,
          classroom: betterClassroom._id
        };
      }
      
      return entry;
    });
    
    return optimizedEntries;
  }
  
  // Find optimal classroom for an entry
  findOptimalClassroom(entry, cls, subject, allEntries) {
    const slotKey = `${entry.day}-${entry.period}`;
    
    // Find classrooms not occupied at this time
    const occupiedRooms = new Set(
      allEntries
        .filter(e => `${e.day}-${e.period}` === slotKey && e !== entry)
        .map(e => e.classroom.toString())
    );
    
    const availableRooms = this.classrooms.filter(room => 
      !occupiedRooms.has(room._id.toString()) &&
      room.capacity >= (cls.strength || 30)
    );
    
    // Prefer lab rooms for lab subjects
    if (subject.isLab) {
      const labRoom = availableRooms.find(room => room.isLab);
      if (labRoom) return labRoom;
    }
    
    // Find room with optimal capacity (not too big, not too small)
    const optimalRoom = availableRooms
      .filter(room => !subject.isLab || !room.isLab) // Don't use lab for non-lab subjects
      .sort((a, b) => {
        const aWaste = a.capacity - (cls.strength || 30);
        const bWaste = b.capacity - (cls.strength || 30);
        return aWaste - bWaste; // Prefer less waste
      })[0];
    
    return optimalRoom;
  }
  
  // Balance teacher workload across days
  balanceTeacherWorkload(entries) {
    const teacherWorkload = new Map();
    
    // Calculate current workload
    for (const entry of entries) {
      const teacherId = entry.teacher.toString();
      if (!teacherWorkload.has(teacherId)) {
        teacherWorkload.set(teacherId, { total: 0, byDay: {} });
      }
      
      const workload = teacherWorkload.get(teacherId);
      workload.total++;
      workload.byDay[entry.day] = (workload.byDay[entry.day] || 0) + 1;
    }
    
    // Identify teachers with unbalanced workload
    const balancedEntries = [...entries];
    
    for (const [teacherId, workload] of teacherWorkload) {
      const dailyHours = Object.values(workload.byDay);
      const maxDaily = Math.max(...dailyHours);
      const minDaily = Math.min(...dailyHours);
      
      // If workload is very unbalanced, try to redistribute
      if (maxDaily - minDaily > 2) {
        console.log(`Balancing workload for teacher ${teacherId}`);
        // Implementation would involve moving classes from heavy days to light days
        // This is a complex operation that would require careful conflict checking
      }
    }
    
    return balancedEntries;
  }
  
  // Check if one timetable is better than another
  hasImprovements(original, optimized) {
    const originalFitness = this.calculateFallbackFitness(original);
    const optimizedFitness = this.calculateFallbackFitness(optimized);
    return optimizedFitness > originalFitness;
  }

  // Distribute subject hours across the week
  distributeHoursAcrossWeek(cls, subject, teacher, hoursPerWeek, weekNumber) {
    const entries = [];
    const periods = this.timeslots.periods || [];
    
    let hoursScheduled = 0;
    let dayIndex = 0;
    let periodIndex = 0;
    
    while (hoursScheduled < hoursPerWeek && dayIndex < this.workingDays.length) {
      const day = this.workingDays[dayIndex];
      const period = periods[periodIndex];
      
      if (period && !period.isBreak) {
        // Find available classroom
        const classroom = this.findAvailableClassroom(cls, subject);
        
        entries.push({
          day,
          period: period.periodNumber,
          class: cls._id,
          subject: subject._id,
          teacher: teacher._id,
          classroom: classroom?._id,
          isCompensation: false,
          isDoubleClass: false,
          isSaturdayClass: false
        });
        
        hoursScheduled++;
      }
      
      // Move to next period/day
      periodIndex++;
      if (periodIndex >= periods.length) {
        periodIndex = 0;
        dayIndex++;
      }
    }
    
    return entries;
  }

  // Find available classroom for a class/subject
  findAvailableClassroom(cls, subject) {
    // Prefer lab classrooms for lab subjects
    if (subject.isLab) {
      const labClassroom = this.classrooms.find(room => 
        room.isLab && room.capacity >= (cls.strength || 30)
      );
      if (labClassroom) return labClassroom;
    }
    
    // Find regular classroom with sufficient capacity
    return this.classrooms.find(room => 
      !room.isLab && room.capacity >= (cls.strength || 30)
    );
  }

  // Get holidays that fall within a specific week
  getHolidaysInWeek(week) {
    const holidays = [];
    
    if (this.semester.holidays) {
      for (const holiday of this.semester.holidays) {
        const holidayStart = new Date(holiday.startDate);
        const holidayEnd = new Date(holiday.endDate);
        
        // Check if holiday overlaps with this week
        if (holidayStart <= week.end && holidayEnd >= week.start) {
          holidays.push(holiday.name);
        }
      }
    }
    
    return holidays;
  }

  // Filter out classes that clash with holidays
  filterHolidayClashes(schedule, holidaysInWeek, week) {
    if (holidaysInWeek.length === 0) {
      return { validEntries: schedule, missedEntries: [] };
    }
    
    const validEntries = [];
    const missedEntries = [];
    
    for (const entry of schedule) {
      const entryDate = this.getDateForDayInWeek(entry.day, week);
      const isHoliday = this.isDateHoliday(entryDate);
      
      if (isHoliday) {
        missedEntries.push(entry);
      } else {
        validEntries.push(entry);
      }
    }
    
    return { validEntries, missedEntries };
  }

  // Get specific date for a day within a week
  getDateForDayInWeek(dayName, week) {
    const dayIndex = this.workingDays.indexOf(dayName);
    if (dayIndex === -1) return null;
    
    const date = new Date(week.start);
    date.setDate(date.getDate() + dayIndex);
    return date;
  }

  // Check if a specific date is a holiday
  isDateHoliday(date) {
    if (!this.semester.holidays || !date) return false;
    
    const checkDate = date.toDateString();
    
    return this.semester.holidays.some(holiday => {
      const holidayStart = new Date(holiday.startDate);
      const holidayEnd = new Date(holiday.endDate);
      
      return date >= holidayStart && date <= holidayEnd;
    });
  }

  // Try to compensate missed classes within the same week
  compensateWithinWeek(validEntries, missedEntries, week) {
    const compensatedEntries = [...validEntries];
    const periods = this.timeslots.periods || [];
    
    for (const missedEntry of missedEntries) {
      let compensated = false;
      
      // Try to find free slots in the same week
      for (const day of this.workingDays) {
        if (compensated) break;
        
        for (const period of periods) {
          if (period.isBreak) continue;
          
          // Check if this slot is free
          const isSlotFree = !compensatedEntries.some(entry => 
            entry.day === day && entry.period === period.periodNumber
          );
          
          if (isSlotFree && !this.isDateHoliday(this.getDateForDayInWeek(day, week))) {
            compensatedEntries.push({
              ...missedEntry,
              day,
              period: period.periodNumber,
              isCompensation: true,
              compensationReason: `Compensating for holiday`
            });
            compensated = true;
            break;
          }
        }
      }
    }
    
    return compensatedEntries;
  }

  // Schedule remaining missed classes on Saturdays
  async scheduleSaturdayCompensation(weeklyTimetables, missedClasses) {
    const periods = this.timeslots.periods || [];
    let saturdayPeriodIndex = 0;
    
    for (const missedClass of missedClasses) {
      // Find the appropriate week to add Saturday class
      const targetWeek = weeklyTimetables.find(wt => wt.weekNumber === missedClass.originalWeek) || 
                        weeklyTimetables[weeklyTimetables.length - 1];
      
      if (saturdayPeriodIndex < periods.length) {
        const period = periods[saturdayPeriodIndex];
        
        if (!period.isBreak) {
          targetWeek.entries.push({
            day: this.compensationDay,
            period: period.periodNumber,
            class: missedClass.class,
            subject: missedClass.subject,
            teacher: missedClass.teacher,
            classroom: missedClass.classroom,
            isCompensation: true,
            isSaturdayClass: true,
            originalWeek: missedClass.originalWeek,
            compensationReason: missedClass.compensationReason
          });
          
          targetWeek.compensationsMade++;
          await targetWeek.save();
          
          saturdayPeriodIndex++;
        }
      }
    }
  }

  // Calculate syllabus progress for each week
  async calculateSyllabusProgress(weeklyTimetables) {
    for (const weeklyTimetable of weeklyTimetables) {
      const progressMap = new Map();
      
      // Count hours per subject for this week
      for (const entry of weeklyTimetable.entries) {
        const subjectId = entry.subject.toString();
        if (!progressMap.has(subjectId)) {
          progressMap.set(subjectId, { plannedHours: 0, actualHours: 0 });
        }
        
        const progress = progressMap.get(subjectId);
        progress.plannedHours++;
        
        // For completed weeks, actualHours would be updated separately
        if (weeklyTimetable.status === 'completed') {
          progress.actualHours++;
        }
      }
      
      // Convert to syllabus progress array
      weeklyTimetable.syllabusProgress = Array.from(progressMap.entries()).map(([subjectId, progress]) => {
        const subject = this.subjects.find(s => s._id.toString() === subjectId);
        const totalHoursNeeded = subject ? subject.hoursPerWeek * weeklyTimetables.length : 0;
        const completionPercentage = totalHoursNeeded > 0 ? 
          Math.round((progress.actualHours / totalHoursNeeded) * 100) : 0;
        
        return {
          subject: subjectId,
          plannedHours: progress.plannedHours,
          actualHours: progress.actualHours,
          completionPercentage
        };
      });
      
      await weeklyTimetable.save();
    }
  }
}

module.exports = SemesterTimetableGenerator;