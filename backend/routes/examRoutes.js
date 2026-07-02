const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, teacherOnly, studentOnly } = require('../middleware/auth');
const Exam            = require('../models/Exam');
const Class           = require('../models/Class');
const ClassEnrollment = require('../models/ClassEnrollment');
const Notification    = require('../models/Notification');
const Subject         = require('../models/Subject');

// ─── Teacher: Create exam ─────────────────────────────────────────────────────
router.post('/', protect, teacherOnly,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('examType').isIn(['adaptive','final']).withMessage('examType must be adaptive or final'),
    body('durationMinutes').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
    body('startTime').isISO8601().withMessage('Valid start time required'),
    body('endTime').isISO8601().withMessage('Valid end time required'),
    body('assignedClasses').isArray({ min: 1 }).withMessage('Assign to at least one class'),
    body('totalQuestions').optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    const { title, description, examType, durationMinutes, startTime, endTime,
            assignedClasses, totalQuestions, passingScore, bloomLevels,
            subject, topic } = req.body;

    if (new Date(endTime) <= new Date(startTime))
      return res.status(400).json({ message: 'End time must be after start time' });

    if (examType === 'final' && !subject)
      return res.status(400).json({ message: 'Final exams require a subject' });

    try {
      const classes = await Class.find({
        _id: { $in: assignedClasses }, teacher: req.user._id, isActive: true,
      });
      if (classes.length !== assignedClasses.length)
        return res.status(400).json({ message: 'One or more classes not found or not owned by you' });

      if (subject) {
        const subjectDoc = await Subject.findOne({ _id: subject, teacher: req.user._id, isActive: true });
        if (!subjectDoc) return res.status(400).json({ message: 'Subject not found' });
      }

      // Generate unique exam code for final tests
      let examCode;
      if (examType === 'final') {
        examCode = await Exam.generateUniqueCode();
      }

      const exam = await Exam.create({
        title,
        description: description || '',
        examType:    examType || 'adaptive',
        teacher:     req.user._id,
        assignedClasses,
        durationMinutes,
        startTime,
        endTime,
        totalQuestions:  totalQuestions || 20,
        passingScore:    passingScore   || 40,
        bloomLevels:     bloomLevels    || ['Remember','Understand','Apply','Analyze','Evaluate','Create'],
        subject:         subject  || undefined,
        topic:           topic    || '',
        isPublished:     true,
        examCode:        examCode || undefined,
      });

      // Notify enrolled students
      for (const cls of classes) {
        const enrollments = await ClassEnrollment.find({ class: cls._id, isActive: true });
        const typeLabel = examType === 'final' ? 'Final Test' : 'Practice Test';
        const codeNote  = examType === 'final' ? ` Use exam code: ${examCode}` : '';
        const notifications = enrollments.map((e) => ({
          recipient:    e.student,
          type:         'exam_assigned',
          title:        `New ${typeLabel}: ${title}`,
          message:      `"${title}" assigned to "${cls.name}". Starts ${new Date(startTime).toLocaleString()}.${codeNote}`,
          relatedExam:  exam._id,
          relatedClass: cls._id,
        }));
        await Notification.insertMany(notifications);
      }

      const populated = await Exam.findById(exam._id)
        .populate('assignedClasses', 'name joinCode')
        .populate('subject', 'name');
      res.status(201).json(populated);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ─── Teacher: Get all my exams ─────────────────────────────────────────────────
router.get('/my', protect, teacherOnly, async (req, res) => {
  try {
    const filter = { teacher: req.user._id };
    if (req.query.examType) filter.examType = req.query.examType;

    const exams = await Exam.find(filter)
      .populate('assignedClasses', 'name joinCode')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Teacher: Update exam ──────────────────────────────────────────────────────
router.put('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const fields = ['title','description','durationMinutes','startTime','endTime',
                    'totalQuestions','passingScore','bloomLevels','subject','topic'];
    fields.forEach((f) => { if (req.body[f] !== undefined) exam[f] = req.body[f]; });

    if (req.body.assignedClasses) {
      const prevClasses = exam.assignedClasses.map((c) => c.toString());
      const added = req.body.assignedClasses.filter((c) => !prevClasses.includes(c));
      exam.assignedClasses = req.body.assignedClasses;
      await exam.save();
      for (const classId of added) {
        const cls = await Class.findById(classId);
        if (!cls) continue;
        const enrollments = await ClassEnrollment.find({ class: classId, isActive: true });
        await Notification.insertMany(enrollments.map((e) => ({
          recipient: e.student, type: 'exam_assigned',
          title: `New Exam: ${exam.title}`,
          message: `"${exam.title}" assigned to "${cls.name}".`,
          relatedExam: exam._id, relatedClass: cls._id,
        })));
      }
    } else {
      await exam.save();
    }

    const updated = await Exam.findById(exam._id)
      .populate('assignedClasses', 'name joinCode')
      .populate('subject', 'name');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── Teacher: Delete exam ─────────────────────────────────────────────────────
router.delete('/:id', protect, teacherOnly, async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Student: Get available exams (enrolled classes) ──────────────────────────
router.get('/student/available', protect, studentOnly, async (req, res) => {
  try {
    const enrollments = await ClassEnrollment.find({ student: req.user._id, isActive: true });
    const classIds = enrollments.map((e) => e.class);
    const filter = { assignedClasses: { $in: classIds }, isPublished: true };
    if (req.query.examType) filter.examType = req.query.examType;

    const exams = await Exam.find(filter)
      .populate('assignedClasses', 'name')
      .populate('teacher', 'name')
      .populate('subject', 'name')
      .sort({ startTime: -1 })
      .lean();
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Student: Lookup exam by code ──────────────────────────────────────────────
router.get('/by-code/:code', protect, studentOnly, async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const exam = await Exam.findOne({ examCode: code, isPublished: true })
      .populate('teacher', 'name')
      .populate('subject', 'name')
      .populate('assignedClasses', 'name')
      .lean();

    if (!exam)
      return res.status(404).json({ message: 'No exam found with that code' });

    const now = new Date();
    if (now < new Date(exam.startTime))
      return res.status(400).json({ message: 'This exam has not started yet' });
    if (now > new Date(exam.endTime))
      return res.status(400).json({ message: 'This exam has ended' });

    // Check if student is enrolled in one of the classes
    const enrollments = await ClassEnrollment.find({
      student: req.user._id,
      class: { $in: exam.assignedClasses.map((c) => c._id) },
      isActive: true,
    });
    if (!enrollments.length)
      return res.status(403).json({ message: 'You are not enrolled in any class assigned to this exam' });

    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get exam by ID ────────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('assignedClasses', 'name joinCode')
      .populate('teacher', 'name email')
      .populate('subject', 'name lessons');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
