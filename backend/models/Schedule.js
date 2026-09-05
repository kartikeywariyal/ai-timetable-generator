const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['personal', 'exam'], required: true },
  entries: [{
    date: String,
    startTime: String,
    endTime: String,
    subject: String,
    description: String,
    location: String
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
