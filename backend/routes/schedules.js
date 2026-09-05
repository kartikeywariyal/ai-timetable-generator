const express = require('express');
const Schedule = require('../models/Schedule');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all schedules for current user (optionally filter by type)
router.get('/', auth, async (req, res) => {
  const filter = { createdBy: req.user.id };
  if (req.query.type) filter.type = req.query.type;
  res.json(await Schedule.find(filter).sort('-createdAt'));
});

router.get('/:id', auth, async (req, res) => {
  const doc = await Schedule.findOne({ _id: req.params.id, createdBy: req.user.id });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
});

router.post('/', auth, async (req, res) => {
  try {
    // Conflict check within same schedule entries
    const { entries = [] } = req.body;
    const slots = new Set();
    for (const e of entries) {
      const key = `${e.date}-${e.startTime}`;
      if (slots.has(key)) return res.status(400).json({ message: `Conflict: two entries at ${e.date} ${e.startTime}` });
      slots.add(key);
    }
    const doc = await Schedule.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(doc);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { entries = [] } = req.body;
    const slots = new Set();
    for (const e of entries) {
      const key = `${e.date}-${e.startTime}`;
      if (slots.has(key)) return res.status(400).json({ message: `Conflict: two entries at ${e.date} ${e.startTime}` });
      slots.add(key);
    }
    const doc = await Schedule.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body, { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  await Schedule.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
  res.json({ message: 'Deleted' });
});

module.exports = router;
