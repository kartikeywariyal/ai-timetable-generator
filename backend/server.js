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
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    databaseHost: mongoose.connection.host || 'unknown'
  });
});

// Register API Routes (supported with both /api/* and direct /* paths)
const apiRoutes = [
  ['/excel', require('./routes/excel')],
  ['/auth', require('./routes/auth')],
  ['/teachers', require('./routes/teachers')],
  ['/subjects', require('./routes/subjects')],
  ['/classes', require('./routes/classes')],
  ['/classrooms', require('./routes/classrooms')],
  ['/timeslots', require('./routes/timeslots')],
  ['/timetable', require('./routes/timetable')],
  ['/export', require('./routes/export')],
  ['/schedules', require('./routes/schedules')],
  ['/substitutes', require('./routes/substitutes')],
  ['/unavailability', require('./routes/unavailability')],
  ['/semesters', require('./routes/semesters')]
];

apiRoutes.forEach(([routePath, router]) => {
  app.use(`/api${routePath}`, router);
  app.use(routePath, router);
});

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
