const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, teacherOnly } = require('../middleware/auth');
const Subject = require('../models/Subject');
const Question = require('../models/Question');

// ─── Create subject ───────────────────────────────────────────────────────────
router.post('/', protect, teacherOnly,
  [body('name').trim().notEmpty().withMessage('Subject name is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const subject = await Subject.create({
        teacher: req.user._id,
        name: req.body.name,
        description: req.body.description || '',
        lessons: req.body.lessons || [],
      });
      res.status(201).json(subject);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// ─── Get all my subjects — MUST come before /:id ──────────────────────────────
router.get('/my', protect, teacherOnly, async (req, res) => {
  try {
    const subjects = await Subject.find({ teacher: req.user._id, isActive: true })
      .sort({ name: 1 })
      .lean();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Add a lesson — MUST come before DELETE /:id ──────────────────────────────
router.post('/:id/lessons', protect, teacherOnly, async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim())
    return res.status(400).json({ message: 'Lesson title is required' });

  try {
    const subject = await Subject.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    subject.lessons.push({ title: title.trim(), order: subject.lessons.length });
    await subject.save();
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Delete a lesson — MUST come before DELETE /:id ───────────────────────────
router.delete('/:id/lessons/:lessonId', protect, teacherOnly, async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const originalLength = subject.lessons.length;
    subject.lessons = subject.lessons.filter(
      (l) => l._id.toString() !== req.params.lessonId
    );
    if (subject.lessons.length === originalLength)
      return res.status(404).json({ message: 'Lesson not found' });

    await subject.save();
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get single subject ────────────────────────────────────────────────────────
router.get('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Update subject (name, description, lessons) ──────────────────────────────
router.put('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    if (req.body.name !== undefined) subject.name = req.body.name;
    if (req.body.description !== undefined) subject.description = req.body.description;
    if (req.body.lessons !== undefined) subject.lessons = req.body.lessons;

    await subject.save();
    res.json(subject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── Delete subject ────────────────────────────────────────────────────────────
router.delete('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const questionCount = await Question.countDocuments({ subject: subject._id, isActive: true });
    if (questionCount > 0)
      return res.status(400).json({
        message: `Cannot delete: ${questionCount} question(s) are linked to this subject. Remove them first.`,
      });

    subject.isActive = false;
    await subject.save();
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
