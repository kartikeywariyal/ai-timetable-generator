const express = require('express');
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => res.json(await Subject.find({ createdBy: req.user.id })));

router.post('/', auth, async (req, res) => {
  try { res.status(201).json(await Subject.create({ ...req.body, createdBy: req.user.id })); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const doc = await Subject.findOneAndUpdate({ _id: req.params.id, createdBy: req.user.id }, req.body, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  await Subject.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
  res.json({ message: 'Deleted' });
});

module.exports = router;
