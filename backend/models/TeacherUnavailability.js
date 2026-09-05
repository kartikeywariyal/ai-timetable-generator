const mongoose = require('mongoose');

const teacherUnavailabilitySchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  type: { 
    type: String, 
    enum: ['leave', 'exam_duty', 'event', 'meeting', 'training', 'other'], 
    required: true 
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  specificSlots: [{
    day: String,
    periods: [Number]
  }],
  isFullDay: { type: Boolean, default: false },
  reason: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('TeacherUnavailability', teacherUnavailabilitySchema);