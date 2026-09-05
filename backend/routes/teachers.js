const express = require('express');
const Teacher = require('../models/Teacher');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  const teachers = await Teacher.find({ createdBy: req.user.id }).populate('subjects');
  res.json(teachers);
});

router.post('/', auth, async (req, res) => {
  try {
    const teacher = await Teacher.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(teacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const teacher = await Teacher.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true }
    );
    if (!teacher) return res.status(404).json({ message: 'Not found' });
    res.json(teacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  await Teacher.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
  res.json({ message: 'Deleted' });
});

module.exports = router;
