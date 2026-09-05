const mongoose = require('mongoose');

const weeklyTimetableSchema = new mongoose.Schema({
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  weekNumber: { type: Number, required: true }, // Week 1, 2, 3, etc.
  weekStartDate: { type: Date, required: true },
  weekEndDate: { type: Date, required: true },
  
  // Weekly schedule entries
  entries: [{
    day: { type: String, required: true }, // Monday, Tuesday, etc.
    period: { type: Number, required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
    
    // Compensation tracking
    isCompensation: { type: Boolean, default: false },
    originalWeek: { type: Number }, // If this is a compensation class, which week was it originally from
    compensationReason: { type: String }, // Holiday name or reason
    
    // Special scheduling
    isDoubleClass: { type: Boolean, default: false },
    isSaturdayClass: { type: Boolean, default: false },
    isExtraClass: { type: Boolean, default: false }
  }],
  
  // Week status and tracking
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed'], default: 'scheduled' },
  holidaysInWeek: [{ type: String }], // Holiday names that affected this week
  compensationsMade: { type: Number, default: 0 }, // Number of compensation classes scheduled
  fitnessScore: { type: Number, default: 0 }, // Timetable quality score
  
  // Syllabus progress for this week
  syllabusProgress: [{
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    plannedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0 }
  }],
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Index for efficient querying
weeklyTimetableSchema.index({ semester: 1, weekNumber: 1 });
weeklyTimetableSchema.index({ semester: 1, weekStartDate: 1 });

// Method to calculate total classes for the week
weeklyTimetableSchema.methods.getTotalClasses = function() {
  return this.entries.length;
};

// Method to get compensation classes count
weeklyTimetableSchema.methods.getCompensationClasses = function() {
  return this.entries.filter(entry => entry.isCompensation).length;
};

// Method to get Saturday classes count
weeklyTimetableSchema.methods.getSaturdayClasses = function() {
  return this.entries.filter(entry => entry.isSaturdayClass).length;
};

// Method to check if week has holidays
weeklyTimetableSchema.methods.hasHolidays = function() {
  return this.holidaysInWeek && this.holidaysInWeek.length > 0;
};

module.exports = mongoose.model('WeeklyTimetable', weeklyTimetableSchema);