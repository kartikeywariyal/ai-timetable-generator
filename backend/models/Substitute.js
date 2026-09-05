const mongoose = require('mongoose');

const substituteSchema = new mongoose.Schema({
  timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', required: true },
  originalEntry: {
    day: String,
    period: Number,
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }
  },
  type: { type: String, enum: ['substitute', 'swap'], required: true },
  
  // For substitute assignments
  substituteTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  isLibrary: { type: Boolean, default: false },
  reason: String,
  
  // For teacher swaps
  swapWith: {
    day: String,
    period: Number,
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
  },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Substitute', substituteSchema);