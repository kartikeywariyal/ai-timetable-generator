const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  name: { type: String, default: 'Generated Timetable' },
  fitnessScore: { type: Number },
  generation: { type: Number },
  entries: [{
    day: String,
    period: Number,
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }
  }],
  constraints: {
    populationSize: { type: Number, default: 50 },
    maxGenerations: { type: Number, default: 200 },
    mutationRate: { type: Number, default: 0.1 },
    crossoverRate: { type: Number, default: 0.8 }
  },
  status: { type: String, enum: ['generating', 'completed', 'failed'], default: 'generating' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
