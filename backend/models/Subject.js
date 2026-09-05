const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String },
  course: { type: String, default: 'General' }, // BTech, BCS, MCA, etc.
  hoursPerWeek: { type: Number, required: true, default: 3 },
  isLab: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
