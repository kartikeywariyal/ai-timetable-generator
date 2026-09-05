const express = require('express');
const Class = require('../models/Class');
const auth = require('../middleware/auth');
const router = express.Router();

//read
router.get('/', auth, async (req, res) => {
  res.json(await Class.find({ createdBy: req.user.id }).populate('subjects.subject subjects.teacher'));
});     

//create
router.post('/', auth, async (req, res) => {
  try { res.status(201).json(await Class.create({ ...req.body, createdBy: req.user.id })); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

//update
router.put('/:id', auth, async (req, res) => {
  try {
    const doc = await Class.findOneAndUpdate({ _id: req.params.id, createdBy: req.user.id }, req.body, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

//delete
router.delete('/:id', auth, async (req, res) => {
  await Class.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
  res.json({ message: 'Deleted' });
});

module.exports = router;
 