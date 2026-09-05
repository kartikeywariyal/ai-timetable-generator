const mongoose = require('mongoose');

const timeslotSchema = new mongoose.Schema({
  days: [{ type: String }],
  periods: [{
    periodNumber: Number,
    startTime: String,
    endTime: String,
    isBreak: { type: Boolean, default: false }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Timeslot', timeslotSchema);
