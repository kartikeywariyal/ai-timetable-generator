const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Fall 2024", "Spring 2025"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  
  // Holiday management
  holidays: [{
    name: String, // e.g., "Diwali", "Christmas"
    startDate: Date,
    endDate: Date,
    type: { type: String, enum: ['national', 'regional', 'institutional'], default: 'institutional' }
  }],
  
  // Buffer slot configuration
  bufferSlots: {
    enabled: { type: Boolean, default: true },
    slotsPerWeek: { type: Number, default: 2 }, // Number of buffer slots per week
    preferredDays: [String], // e.g., ['Friday', 'Saturday']
    preferredPeriods: [Number] // e.g., [7, 8, 9] - last periods
  },
  
  // Double period settings
  doublePeriods: {
    enabled: { type: Boolean, default: true },
    maxPerDay: { type: Number, default: 2 },
    preferredSubjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }], // Subjects that benefit from double periods
    minGapBetween: { type: Number, default: 1 } // Minimum periods between double periods
  },
  
  // Syllabus tracking
  syllabusTracking: {
    enabled: { type: Boolean, default: true },
    targetCompletion: { type: Number, default: 95 }, // Percentage
    warningThreshold: { type: Number, default: 80 } // Alert when below this percentage
  },
  
  // Academic calendar
  academicCalendar: {
    totalTeachingDays: Number,
    actualTeachingDays: Number, // After excluding holidays
    weeklySchedule: [String], // Working days e.g., ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    periodsPerDay: Number
  },
  
  // Redistribution settings
  redistributionSettings: {
    autoRedistribute: { type: Boolean, default: true },
    prioritizeCore: { type: Boolean, default: true }, // Prioritize core subjects over electives
    allowWeekendClasses: { type: Boolean, default: false },
    maxDailyHours: { type: Number, default: 8 }
  },
  
  status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Calculate total teaching days excluding holidays
semesterSchema.methods.calculateTeachingDays = function() {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  if (!this.academicCalendar) this.academicCalendar = {};
  const workingDays = this.academicCalendar.weeklySchedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  let totalDays = 0;
  let actualDays = 0;
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (workingDays.includes(dayName)) {
      totalDays++;
      
      // Check if this date is a holiday
      const isHoliday = (this.holidays || []).some(holiday => {
        const holidayStart = new Date(holiday.startDate);
        const holidayEnd = new Date(holiday.endDate);
        return date >= holidayStart && date <= holidayEnd;
      });
      
      if (!isHoliday) {
        actualDays++;
      }
    }
  }
  
  this.academicCalendar.totalTeachingDays = totalDays;
  this.academicCalendar.actualTeachingDays = actualDays;
  
  return { totalDays, actualDays };
};

module.exports = mongoose.model('Semester', semesterSchema);