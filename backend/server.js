const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: [
    process.env.CLIENT_URL?.replace(/\/$/, ''),
    'http://localhost:3000',
    'https://chrono-siddhartha010.vercel.app',
    /\.vercel\.app$/,
    /\.netlify\.app$/
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Root route - MUST be first
app.get('/', (req, res) => {
  console.log('Root route called');
  res.json({ 
    message: 'ChronoGen Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health or /api/health',
      excel: '/api/excel/template'
    }
  });
});

// Health check endpoints
app.get('/health', (req, res) => {
  console.log('Root health check called');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'ChronoGen Backend is running',
    routes: 'Available'
  });
});

app.get('/api/health', (req, res) => {
  console.log('API health check called');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'ChronoGen Backend is running',
    version: '1.0.0'
  });
});

// Other API Routes
app.use('/api/excel', require('./routes/excel'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/classrooms', require('./routes/classrooms'));
app.use('/api/timeslots', require('./routes/timeslots'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/export', require('./routes/export'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/substitutes', require('./routes/substitutes'));
app.use('/api/unavailability', require('./routes/unavailability'));
app.use('/api/semesters', require('./routes/semesters'));

// Catch-all for unmatched routes
app.use('*', (req, res) => {
  console.log('Unmatched route:', req.method, req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method, 
    path: req.originalUrl,
    availableRoutes: {
      root: '/',
      health: '/health, /api/health',
      excel: '/api/excel/test, /api/excel/template, /api/excel/upload',
      auth: '/api/auth/*',
      data: '/api/teachers, /api/subjects, /api/classes, etc.'
    }
  });
});

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chronogen';

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err.message));
}

module.exports = app;
