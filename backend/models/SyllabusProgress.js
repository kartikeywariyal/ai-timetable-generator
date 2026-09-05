const mongoose = require('mongoose');

const syllabusProgressSchema = new mongoose.Schema({
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  
  // Syllabus planning
  totalHoursRequired: { type: Number, required: true }, // Total hours needed for syllabus completion
  hoursScheduled: { type: Number, default: 0 }, // Hours currently scheduled in timetable
  hoursCompleted: { type: Number, default: 0 }, // Hours actually taught
  
  // Progress tracking
  completionPercentage: { type: Number, default: 0 },
  isOnTrack: { type: Boolean, default: true },
  
  // Redistribution tracking
  redistributedHours: { type: Number, default: 0 }, // Hours added due to holiday redistribution
  bufferHoursUsed: { type: Number, default: 0 }, // Buffer slots utilized
  doublePeriodsUsed: { type: Number, default: 0 }, // Double periods created
  
  // Holiday impact
  holidayImpact: [{
    holidayName: String,
    lostHours: Number,
    redistributedTo: [{
      date: Date,
      period: Number,
      type: { type: String, enum: ['buffer', 'double', 'weekend', 'extended'] }
    }]
  }],
  
  // Alerts and warnings
  alerts: [{
    type: { type: String, enum: ['behind_schedule', 'syllabus_risk', 'redistribution_needed'] },
    message: String,
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    createdAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
  }],
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Calculate completion percentage
syllabusProgressSchema.methods.updateProgress = function() {
  if (this.totalHoursRequired > 0) {
    this.completionPercentage = Math.round((this.hoursCompleted / this.totalHoursRequired) * 100);
    this.isOnTrack = this.completionPercentage >= 80; // Configurable threshold
  }
};

// Add alert
syllabusProgressSchema.methods.addAlert = function(type, message, severity = 'medium') {
  this.alerts.push({
    type,
    message,
    severity,
    createdAt: new Date(),
    resolved: false
  });
};

module.exports = mongoose.model('SyllabusProgress', syllabusProgressSchema);