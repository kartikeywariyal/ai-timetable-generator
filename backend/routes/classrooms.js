const express = require('express');
const Classroom = require('../models/Classroom');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => res.json(await Classroom.find({ createdBy: req.user.id })));

router.post('/', auth, async (req, res) => {
  try { res.status(201).json(await Classroom.create({ ...req.body, createdBy: req.user.id })); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const doc = await Classroom.findOneAndUpdate({ _id: req.params.id, createdBy: req.user.id }, req.body, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  await Classroom.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
  res.json({ message: 'Deleted' });
});

module.exports = router;
