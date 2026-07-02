const express = require('express');
const router  = express.Router();
const { protect, teacherOnly, studentOnly } = require('../middleware/auth');
const Attempt         = require('../models/Attempt');
const Class           = require('../models/Class');
const ClassEnrollment = require('../models/ClassEnrollment');
const Exam            = require('../models/Exam');
const Question        = require('../models/Question');
const Subject         = require('../models/Subject');
const StudentProfile  = require('../models/StudentProfile');

const BLOOM_SEQUENCE = ['Remember','Understand','Apply','Analyze','Evaluate','Create'];

function bloomDist(attempts) {
  const dist = {};
  BLOOM_SEQUENCE.forEach((l) => (dist[l] = 0));
  attempts.forEach((a) => { if (a.finalBloomLevel) dist[a.finalBloomLevel]++; });
  return dist;
}

function scoreDist(attempts) {
  const d = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  attempts.forEach((a) => {
    if      (a.percentage <= 20) d['0-20']++;
    else if (a.percentage <= 40) d['21-40']++;
    else if (a.percentage <= 60) d['41-60']++;
    else if (a.percentage <= 80) d['61-80']++;
    else                         d['81-100']++;
  });
  return d;
}

function avgTime(attempts) {
  if (!attempts.length) return 0;
  return Math.round(attempts.reduce((s, a) => s + (a.totalTimeTakenSeconds || 0), 0) / attempts.length);
}

// ── Teacher dashboard summary ─────────────────────────────────────────────────
router.get('/teacher/dashboard', protect, teacherOnly, async (req, res) => {
  try {
    const classes  = await Class.find({ teacher: req.user._id, isActive: true }).lean();
    const exams    = await Exam.find({ teacher: req.user._id }).lean();
    const examIds  = exams.map((e) => e._id);
    const classIds = classes.map((c) => c._id);

    const totalStudents = await ClassEnrollment.countDocuments({ class: { $in: classIds }, isActive: true });
    const totalAttempts = await Attempt.countDocuments({ exam: { $in: examIds }, status: { $in: ['completed','timed_out'] } });
    const totalQuestions = await Question.countDocuments({ teacher: req.user._id, isActive: true });

    const agg = await Attempt.aggregate([
      { $match: { exam: { $in: examIds }, status: { $in: ['completed','timed_out'] } } },
      { $group: { _id: null, avgScore: { $avg: '$percentage' }, avgTime: { $avg: '$totalTimeTakenSeconds' } } },
    ]);

    res.json({
      totalClasses:    classes.length,
      totalExams:      exams.length,
      totalStudents,
      totalAttempts,
      totalQuestions,
      avgScore:        agg[0] ? Math.round(agg[0].avgScore * 100) / 100 : 0,
      avgTimeSecs:     agg[0] ? Math.round(agg[0].avgTime) : 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Teacher: Class analytics ──────────────────────────────────────────────────
router.get('/teacher/class/:classId', protect, teacherOnly, async (req, res) => {
  try {
    const cls = await Class.findOne({ _id: req.params.classId, teacher: req.user._id });
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    const exams   = await Exam.find({ assignedClasses: cls._id, teacher: req.user._id }).lean();
    const examIds = exams.map((e) => e._id);

    const attempts = await Attempt.find({
      exam: { $in: examIds }, class: cls._id, status: { $in: ['completed','timed_out'] },
    })
      .populate('student', 'name email')
      .populate('exam',    'title examType')
      .lean();

    if (!attempts.length)
      return res.json({ message: 'No attempts yet', classId: cls._id, className: cls.name, attempts: [] });

    const avg = attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length;
    const enrollmentCount = await ClassEnrollment.countDocuments({ class: cls._id, isActive: true });

    // Per-exam time breakdown
    const examTimeSummary = {};
    attempts.forEach((a) => {
      const key = a.exam?._id?.toString();
      if (!key) return;
      if (!examTimeSummary[key]) examTimeSummary[key] = { title: a.exam.title, totalSecs: 0, count: 0 };
      examTimeSummary[key].totalSecs += (a.totalTimeTakenSeconds || 0);
      examTimeSummary[key].count     += 1;
    });
    const examTimeList = Object.values(examTimeSummary).map((e) => ({
      ...e, avgSecs: Math.round(e.totalSecs / e.count),
    }));

    res.json({
      classId:             cls._id,
      className:           cls.name,
      enrollmentCount,
      totalAttempts:       attempts.length,
      avgScore:            Math.round(avg * 100) / 100,
      avgTimeSecs:         avgTime(attempts),
      scoreDistribution:   scoreDist(attempts),
      bloomDistribution:   bloomDist(attempts),
      examTimeList,
      recentAttempts:      attempts.slice(0, 20),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Teacher: Exam analytics (with time + bloom breakdown) ────────────────────
router.get('/teacher/exam/:examId', protect, teacherOnly, async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.examId, teacher: req.user._id })
      .populate('subject', 'name').lean();
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const attempts = await Attempt.find({
      exam: exam._id, status: { $in: ['completed','timed_out'] },
    })
      .populate('student', 'name email')
      .populate('class',   'name')
      .lean();

    // Per-class breakdown
    const perClass = {};
    attempts.forEach((a) => {
      const key = a.class?._id?.toString() || 'unassigned';
      if (!perClass[key]) perClass[key] = { className: a.class?.name || 'Unknown', attempts: [] };
      perClass[key].attempts.push(a);
    });
    const classSummaries = Object.entries(perClass).map(([id, d]) => {
      const avg = d.attempts.reduce((s, a) => s + a.percentage, 0) / d.attempts.length;
      return {
        classId: id, className: d.className,
        count: d.attempts.length,
        avgScore: Math.round(avg * 100) / 100,
        avgTimeSecs: avgTime(d.attempts),
      };
    });

    // Bloom breakdown across all attempts
    const bloomBreakdown = {};
    BLOOM_SEQUENCE.forEach((l) => (bloomBreakdown[l] = { total: 0, correct: 0 }));
    attempts.forEach((a) => {
      a.answers?.forEach((ans) => {
        if (ans.bloomLevelAtAnswer) {
          bloomBreakdown[ans.bloomLevelAtAnswer].total++;
          if (ans.isCorrect) bloomBreakdown[ans.bloomLevelAtAnswer].correct++;
        }
      });
    });

    res.json({
      examId:          exam._id,
      examTitle:       exam.title,
      examType:        exam.examType,
      examCode:        exam.examCode,
      subject:         exam.subject,
      totalAttempts:   attempts.length,
      avgScore:        attempts.length ? Math.round(attempts.reduce((s,a) => s+a.percentage,0)/attempts.length*100)/100 : 0,
      avgTimeSecs:     avgTime(attempts),
      bloomDistribution: bloomDist(attempts),
      bloomBreakdown,
      scoreDistribution: scoreDist(attempts),
      classSummaries,
      attempts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Teacher: Subject analytics ────────────────────────────────────────────────
router.get('/teacher/subject/:subjectId', protect, teacherOnly, async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.subjectId, teacher: req.user._id });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const exams   = await Exam.find({ teacher: req.user._id, subject: subject._id }).lean();
    const examIds = exams.map((e) => e._id);

    const attempts = await Attempt.find({
      exam: { $in: examIds }, status: { $in: ['completed','timed_out'] },
    })
      .populate('student', 'name email')
      .populate('exam',    'title examType')
      .lean();

    const bloomBreakdown = {};
    BLOOM_SEQUENCE.forEach((l) => (bloomBreakdown[l] = { total: 0, correct: 0 }));
    attempts.forEach((a) => {
      a.answers?.forEach((ans) => {
        if (ans.bloomLevelAtAnswer) {
          bloomBreakdown[ans.bloomLevelAtAnswer].total++;
          if (ans.isCorrect) bloomBreakdown[ans.bloomLevelAtAnswer].correct++;
        }
      });
    });

    const questionCount = await Question.countDocuments({ teacher: req.user._id, subject: subject._id, isActive: true });

    res.json({
      subjectId:    subject._id,
      subjectName:  subject.name,
      lessons:      subject.lessons,
      questionCount,
      totalExams:   exams.length,
      totalAttempts: attempts.length,
      avgScore:     attempts.length ? Math.round(attempts.reduce((s,a)=>s+a.percentage,0)/attempts.length*100)/100 : 0,
      avgTimeSecs:  avgTime(attempts),
      bloomDistribution: bloomDist(attempts),
      bloomBreakdown,
      scoreDistribution: scoreDist(attempts),
      recentAttempts: attempts.slice(0, 15),
      exams,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Teacher: Individual student report ───────────────────────────────────────
router.get('/teacher/student/:studentId', protect, teacherOnly, async (req, res) => {
  try {
    const teacherClasses = await Class.find({ teacher: req.user._id, isActive: true });
    const classIds = teacherClasses.map((c) => c._id);
    const enrolled = await ClassEnrollment.findOne({ class: { $in: classIds }, student: req.params.studentId, isActive: true });
    if (!enrolled) return res.status(403).json({ message: 'Student not in your classes' });

    const exams   = await Exam.find({ teacher: req.user._id });
    const examIds = exams.map((e) => e._id);

    const attempts = await Attempt.find({ student: req.params.studentId, exam: { $in: examIds }, status: { $in: ['completed','timed_out'] } })
      .populate('exam',  'title startTime examType')
      .populate('class', 'name')
      .sort({ completedAt: -1 })
      .lean();

    const profile = await StudentProfile.findOne({ user: req.params.studentId }).lean();
    const avgScore = attempts.length ? Math.round(attempts.reduce((s,a)=>s+a.percentage,0)/attempts.length*100)/100 : 0;

    res.json({ attempts, profile, avgScore, totalAttempts: attempts.length, avgTimeSecs: avgTime(attempts) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Student dashboard ─────────────────────────────────────────────────────────
router.get('/student/dashboard', protect, studentOnly, async (req, res) => {
  try {
    const attempts = await Attempt.find({ student: req.user._id, status: { $in: ['completed','timed_out'] } })
      .populate('exam',  'title startTime examType')
      .populate('class', 'name')
      .sort({ completedAt: -1 })
      .lean();

    const avg = attempts.length
      ? Math.round(attempts.reduce((s,a)=>s+a.percentage,0)/attempts.length*100)/100 : 0;

    const bloomStats = {};
    BLOOM_SEQUENCE.forEach((l) => (bloomStats[l] = { total: 0, correct: 0 }));
    attempts.forEach((a) => {
      a.answers?.forEach((ans) => {
        if (ans.bloomLevelAtAnswer) {
          bloomStats[ans.bloomLevelAtAnswer].total++;
          if (ans.isCorrect) bloomStats[ans.bloomLevelAtAnswer].correct++;
        }
      });
    });

    const strengths   = [];
    const weaknesses  = [];
    Object.entries(bloomStats).forEach(([level, s]) => {
      if (!s.total) return;
      const rate = s.correct / s.total;
      if (rate >= 0.7) strengths.push({ level, rate: Math.round(rate * 100) });
      else if (rate < 0.5) weaknesses.push({ level, rate: Math.round(rate * 100) });
    });

    const recommendations = BLOOM_SEQUENCE.filter((l) => {
      const s = bloomStats[l];
      return !s.total || s.correct / s.total < 0.7;
    }).slice(0, 5);

    res.json({
      totalAttempts:  attempts.length,
      avgScore:       avg,
      avgTimeSecs:    avgTime(attempts),
      recentAttempts: attempts.slice(0, 5),
      bloomProgression: attempts.map((a) => ({
        examTitle: a.exam?.title, date: a.completedAt,
        finalBloomLevel: a.finalBloomLevel, percentage: a.percentage,
        timeSecs: a.totalTimeTakenSeconds || 0,
      })),
      strengths, weaknesses, recommendations, bloomStats,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
