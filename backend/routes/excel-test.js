const express = require('express');
const router = express.Router();

// Most basic test route - no auth, no dependencies
router.get('/test', (req, res) => {
  console.log('TEST ROUTE CALLED');
  res.json({ message: 'Excel route is working', timestamp: new Date().toISOString() });
});

// Basic template download - no auth required for testing
router.get('/template', (req, res) => {
  console.log('TEMPLATE ROUTE CALLED');
  console.log('Request headers:', req.headers);
  
  try {
    const simpleCSV = `Class Name,Section,Strength
BTech CSE,A,60
BTech CSE,B,58
BCS,A,45`;

    console.log('Sending CSV response');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="template.csv"');
    res.send(simpleCSV);
    console.log('CSV sent successfully');
  } catch (error) {
    console.error('Template error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Basic upload route - no auth, no file processing
router.post('/upload', (req, res) => {
  console.log('UPLOAD ROUTE CALLED');
  console.log('Request body:', req.body);
  
  res.json({
    success: true,
    message: 'Upload route working',
    data: {
      classes: [{ name: 'Test Class', section: 'A', strength: 30 }],
      subjects: [{ name: 'Test Subject', code: 'TS101', hoursPerWeek: 3 }],
      teachers: [{ name: 'Test Teacher', email: 'test@test.com' }],
      classrooms: [{ name: 'Test Room', capacity: 30 }],
      timeSlots: { days: ['Monday'], periods: [{ periodNumber: 1, startTime: '09:00', endTime: '10:00' }] },
      assignments: [{ className: 'Test Class', section: 'A', subjectName: 'Test Subject', teacherName: 'Test Teacher' }],
      errors: [],
      warnings: ['This is a test response']
    }
  });
});

module.exports = router;