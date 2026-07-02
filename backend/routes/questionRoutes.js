const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, teacherOnly } = require('../middleware/auth');
const Question = require('../models/Question');
const Subject   = require('../models/Subject');

const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

// ── helpers ───────────────────────────────────────────────────────────────────
function validateOptions(options, isMultiple) {
  const correctCount = options.filter((o) => o.isCorrect).length;
  if (correctCount === 0) return 'At least one option must be marked as correct';
  // isMultiple is auto-detected — no minimum of 2 enforced server-side
  return null;
}

async function verifySubjectAndTopic(subjectId, topic, teacherId) {
  const subjectDoc = await Subject.findOne({
    _id: subjectId, teacher: teacherId, isActive: true,
  });
  if (!subjectDoc) return { error: 'Subject not found or not owned by you' };
  if (topic) {
    const topicExists = subjectDoc.lessons.some((l) => l.title === topic);
    if (!topicExists)
      return { error: `Topic "${topic}" does not exist in subject "${subjectDoc.name}"` };
  }
  return { subjectDoc };
}

// ── stats  (/stats/summary must be before /:id) ───────────────────────────────
router.get('/stats/summary', protect, teacherOnly, async (req, res) => {
  try {
    const match = { teacher: req.user._id, isActive: true };
    const total   = await Question.countDocuments(match);
    const hidden  = await Question.countDocuments({ ...match, isHidden: true });
    const byBloom = await Question.aggregate([
      { $match: match },
      { $group: { _id: '$bloomLevel', count: { $sum: 1 } } },
    ]);
    res.json({ total, hidden, byBloom });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── create ────────────────────────────────────────────────────────────────────
router.post(
  '/',
  protect, teacherOnly,
  [
    body('questionText').notEmpty().withMessage('Question text is required'),
    body('options').isArray({ min: 2, max: 6 }).withMessage('Provide 2–6 options'),
    body('bloomLevel').isIn(BLOOM_LEVELS).withMessage("Invalid Bloom's level"),
    body('subject').notEmpty().withMessage('Subject is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    const { questionText, options, bloomLevel, explanation,
            subject, topic, isMultipleCorrect } = req.body;
    const isMultiple = !!isMultipleCorrect;

    const optError = validateOptions(options, isMultiple);
    if (optError) return res.status(400).json({ message: optError });

    const { error } = await verifySubjectAndTopic(subject, topic, req.user._id);
    if (error) return res.status(400).json({ message: error });

    try {
      const q = await Question.create({
        teacher: req.user._id,
        questionText,
        options,
        isMultipleCorrect: isMultiple,
        bloomLevel,
        explanation: explanation || '',
        subject,
        topic: topic || '',
      });
      const populated = await Question.findById(q._id).populate('subject', 'name lessons');
      res.status(201).json(populated);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// ── get all my questions ──────────────────────────────────────────────────────
router.get('/my', protect, teacherOnly, async (req, res) => {
  try {
    const filter = { teacher: req.user._id, isActive: true };
    if (req.query.bloomLevel) filter.bloomLevel  = req.query.bloomLevel;
    if (req.query.subject)    filter.subject      = req.query.subject;
    if (req.query.topic)      filter.topic        = req.query.topic;
    if (req.query.showHidden !== 'true') {
      // by default hide hidden questions — pass ?showHidden=true to include them
      // actually teacher needs to see ALL including hidden in bank, just mark them
      // so we include hidden but frontend shows indicator
    }

    const questions = await Question.find(filter)
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── get single ────────────────────────────────────────────────────────────────
router.get('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const q = await Question.findOne({ _id: req.params.id, teacher: req.user._id })
      .populate('subject', 'name lessons');
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json(q);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── update ────────────────────────────────────────────────────────────────────
router.put('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const q = await Question.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!q) return res.status(404).json({ message: 'Question not found' });

    if (req.body.subject !== undefined) {
      const { error } = await verifySubjectAndTopic(
        req.body.subject, req.body.topic, req.user._id
      );
      if (error) return res.status(400).json({ message: error });
    }

    const isMultiple = req.body.isMultipleCorrect !== undefined
      ? !!req.body.isMultipleCorrect
      : q.isMultipleCorrect;

    if (req.body.options) {
      const optError = validateOptions(req.body.options, isMultiple);
      if (optError) return res.status(400).json({ message: optError });
    }

    const fields = ['questionText','options','bloomLevel','explanation',
                    'subject','topic','isMultipleCorrect'];
    fields.forEach((f) => { if (req.body[f] !== undefined) q[f] = req.body[f]; });

    await q.save();
    const populated = await Question.findById(q._id).populate('subject', 'name lessons');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── toggle hide/show ──────────────────────────────────────────────────────────
router.patch('/:id/toggle-hidden', protect, teacherOnly, async (req, res) => {
  try {
    const q = await Question.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!q) return res.status(404).json({ message: 'Question not found' });
    q.isHidden = !q.isHidden;
    await q.save();
    res.json({ _id: q._id, isHidden: q.isHidden });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── soft delete ───────────────────────────────────────────────────────────────
router.delete('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const q = await Question.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!q) return res.status(404).json({ message: 'Question not found' });
    q.isActive = false;
    await q.save();
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
