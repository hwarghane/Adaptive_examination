const express = require('express');
const router  = express.Router();
const QRCode  = require('qrcode');
const { body, validationResult } = require('express-validator');
const { protect, teacherOnly, studentOnly } = require('../middleware/auth');
const Class           = require('../models/Class');
const ClassEnrollment = require('../models/ClassEnrollment');
const Notification    = require('../models/Notification');
const StudentProfile  = require('../models/StudentProfile');

// ── helpers ───────────────────────────────────────────────────────────────────
const generateJoinCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const getUniqueJoinCode = async () => {
  let code, exists;
  do {
    code = generateJoinCode();
    exists = await Class.findOne({ joinCode: code });
  } while (exists);
  return code;
};

// ════════════════════════════════════════════════════════════════════════════════
//  IMPORTANT: all fixed-path routes MUST come before /:id routes
// ════════════════════════════════════════════════════════════════════════════════

// ─── Teacher: Create class ────────────────────────────────────────────────────
router.post('/', protect, teacherOnly,
  [
    body('name').trim().notEmpty().withMessage('Class name is required').isLength({ max: 100 }),
    body('description').optional().trim(),
    body('subject').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const joinCode    = await getUniqueJoinCode();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const inviteLink  = `${frontendUrl}/join/${joinCode}`;

      const qrCode = await QRCode.toDataURL(inviteLink, {
        width: 300, margin: 2,
        color: { dark: '#1e40af', light: '#ffffff' },
      });

      const newClass = await Class.create({
        name:        req.body.name,
        description: req.body.description || '',
        subject:     req.body.subject     || '',
        teacher:     req.user._id,
        joinCode,
        inviteLink,
        qrCode,
      });

      res.status(201).json(newClass);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ─── Teacher: Get my classes ──────────────────────────────────────────────────
router.get('/my', protect, teacherOnly, async (req, res) => {
  try {
    const classes = await Class.find({ teacher: req.user._id, isActive: true })
      .sort({ createdAt: -1 }).lean();

    const withCounts = await Promise.all(
      classes.map(async (c) => {
        const count = await ClassEnrollment.countDocuments({ class: c._id, isActive: true });
        return { ...c, enrollmentCount: count };
      })
    );

    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Student: Join class by code  ─────────────────────────────────────────────
//  NOTE: must come before GET /:id so "join" isn't treated as an id
router.post('/join', protect, studentOnly, async (req, res) => {
  const { joinCode } = req.body;
  if (!joinCode) return res.status(400).json({ message: 'Join code is required' });

  const code = joinCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code))
    return res.status(400).json({ message: 'Invalid join code format (must be 8 characters)' });

  try {
    const cls = await Class.findOne({ joinCode: code, isActive: true })
      .populate('teacher', 'name email');
    if (!cls) return res.status(404).json({ message: 'Invalid join code — no class found.' });

    const existing = await ClassEnrollment.findOne({ class: cls._id, student: req.user._id });
    if (existing) {
      if (existing.isActive)
        return res.status(400).json({ message: 'You are already enrolled in this class' });
      existing.isActive = true;
      existing.joinedAt = new Date();
      await existing.save();
    } else {
      await ClassEnrollment.create({ class: cls._id, student: req.user._id });
    }

    await Notification.create({
      recipient: req.user._id,
      type:      'class_joined',
      title:     `Joined: ${cls.name}`,
      message:   `You successfully joined "${cls.name}" taught by ${cls.teacher.name}.`,
      relatedClass: cls._id,
    });

    res.json({ message: `Successfully joined "${cls.name}"`, class: cls });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Student: Get enrolled classes ────────────────────────────────────────────
//  NOTE: must come before GET /:id so "enrolled" isn't treated as an id
router.get('/enrolled/me', protect, studentOnly, async (req, res) => {
  try {
    const enrollments = await ClassEnrollment.find({ student: req.user._id, isActive: true })
      .populate({ path: 'class', populate: { path: 'teacher', select: 'name email' } })
      .lean();

    const classes = enrollments
      .filter((e) => e.class && e.class.isActive)
      .map((e) => ({ ...e.class, joinedAt: e.joinedAt }));

    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Public: Resolve class by join code (for QR / invite link preview) ────────
//  NOTE: must come before GET /:id
router.get('/resolve/:code', async (req, res) => {
  try {
    const cls = await Class.findOne({
      joinCode: req.params.code.trim().toUpperCase(),
      isActive: true,
    })
      .populate('teacher', 'name email')
      .lean();

    if (!cls) return res.status(404).json({ message: 'Invalid or expired invite link' });

    res.json({
      _id:         cls._id,
      name:        cls.name,
      description: cls.description,
      subject:     cls.subject,
      joinCode:    cls.joinCode,
      teacher:     cls.teacher,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Teacher: Get single class detail ─────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id)
      .populate('teacher', 'name email').lean();
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    if (req.user.role === 'teacher' && cls.teacher._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Access denied' });

    const enrollmentCount = await ClassEnrollment.countDocuments({ class: cls._id, isActive: true });
    res.json({ ...cls, enrollmentCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Teacher: Update class ────────────────────────────────────────────────────
router.put('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const cls = await Class.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    if (req.body.name)                     cls.name        = req.body.name;
    if (req.body.description !== undefined) cls.description = req.body.description;
    if (req.body.subject     !== undefined) cls.subject     = req.body.subject;

    await cls.save();
    res.json(cls);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── Teacher: Delete / archive class ─────────────────────────────────────────
router.delete('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const cls = await Class.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    cls.isActive = false;
    await cls.save();
    res.json({ message: 'Class archived successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Teacher: Get students in class ──────────────────────────────────────────
router.get('/:id/students', protect, teacherOnly, async (req, res) => {
  try {
    const cls = await Class.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    const enrollments = await ClassEnrollment.find({ class: cls._id, isActive: true })
      .populate('student', 'name email createdAt').lean();

    const students = await Promise.all(
      enrollments.map(async (e) => {
        const profile = await StudentProfile.findOne({ user: e.student._id }).lean();
        return { enrollmentId: e._id, joinedAt: e.joinedAt, student: { ...e.student, profile } };
      })
    );

    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Teacher: Remove student from class ──────────────────────────────────────
router.delete('/:id/students/:studentId', protect, teacherOnly, async (req, res) => {
  try {
    const cls = await Class.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    const enrollment = await ClassEnrollment.findOne({ class: cls._id, student: req.params.studentId });
    if (!enrollment) return res.status(404).json({ message: 'Student not enrolled' });

    enrollment.isActive = false;
    await enrollment.save();
    res.json({ message: 'Student removed from class' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
