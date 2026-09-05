const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  course: { type: String, default: 'General' }, // BTech, BCS, MCA, etc.
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  availability: [{
    day: String,
    periods: [Number]
  }],
  maxHoursPerDay: { type: Number, default: 6 },
  maxHoursPerWeek: { type: Number, default: 30 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);
