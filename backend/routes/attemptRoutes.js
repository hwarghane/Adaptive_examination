const express = require('express');
const router  = express.Router();
const { protect, studentOnly } = require('../middleware/auth');
const Attempt         = require('../models/Attempt');
const Exam            = require('../models/Exam');
const Question        = require('../models/Question');
const ClassEnrollment = require('../models/ClassEnrollment');

const BLOOM_SEQUENCE = ['Remember','Understand','Apply','Analyze','Evaluate','Create'];
// difficulty 1-6 mirrors bloom index; advance when correct pushes diff > threshold
const ADVANCE_THRESHOLD = 4;   // diff > 4 triggers bloom-up check
const MASTERY_RATE      = 0.70; // 70% correct on current level to advance
const REGRESS_RATE      = 0.40; // <40% correct triggers bloom-down

// ── scoring helper for multiple-correct questions ─────────────────────────────
// selectedIndices: number[]  correctIndices: number[]
function scoreMultiple(selectedIndices, correctIndices) {
  const sel = new Set(selectedIndices);
  const cor = new Set(correctIndices);
  // All selected must be correct AND all correct must be selected
  const allCorrectSelected = [...cor].every((i) => sel.has(i));
  const noWrongSelected    = [...sel].every((i) => cor.has(i));
  return allCorrectSelected && noWrongSelected;
}

// ── question selector – adaptive ──────────────────────────────────────────────
async function pickAdaptive(attempt, exam) {
  const { currentBloomLevel, currentDifficultyFactor, askedQuestionIds } = attempt;

  const base = {
    isActive: true, isHidden: false,
    teacher:  exam.teacher,
    bloomLevel: { $in: exam.bloomLevels },
    _id: { $nin: askedQuestionIds },
    ...(exam.subject ? { subject: exam.subject } : {}),
  };

  // 1st: exact bloom + exact difficulty
  let q = await Question.findOne({ ...base, bloomLevel: currentBloomLevel, difficultyFactor: currentDifficultyFactor });

  // 2nd: same bloom, nearest difficulty
  if (!q) {
    const cands = await Question.find({ ...base, bloomLevel: currentBloomLevel }).lean();
    if (cands.length) {
      cands.sort((a, b) => Math.abs(a.difficultyFactor - currentDifficultyFactor) - Math.abs(b.difficultyFactor - currentDifficultyFactor));
      q = cands[0];
    }
  }

  // 3rd: any bloom, nearest difficulty
  if (!q) {
    const cands = await Question.find(base).lean();
    if (cands.length) {
      cands.sort((a, b) => Math.abs(a.difficultyFactor - currentDifficultyFactor) - Math.abs(b.difficultyFactor - currentDifficultyFactor));
      q = cands[0];
    }
  }

  return q || null;
}

// ── question selector – final (random, bloom-ordered) ────────────────────────
async function pickFinal(attempt, exam) {
  const { askedQuestionIds, currentBloomLevel, currentDifficultyFactor } = attempt;

  const base = {
    isActive: true, isHidden: false,
    teacher:  exam.teacher,
    subject:  exam.subject,
    _id: { $nin: askedQuestionIds },
    ...(exam.topic ? { topic: exam.topic } : {}),
  };

  // Same adaptive logic for final — bloom-adaptive too
  let q = await Question.findOne({ ...base, bloomLevel: currentBloomLevel, difficultyFactor: currentDifficultyFactor });

  if (!q) {
    const cands = await Question.find({ ...base, bloomLevel: currentBloomLevel }).lean();
    if (cands.length) {
      cands.sort((a, b) => Math.abs(a.difficultyFactor - currentDifficultyFactor) - Math.abs(b.difficultyFactor - currentDifficultyFactor));
      q = cands[0];
    }
  }

  if (!q) {
    const cands = await Question.find(base).lean();
    if (cands.length) {
      cands.sort((a, b) => Math.abs(a.difficultyFactor - currentDifficultyFactor) - Math.abs(b.difficultyFactor - currentDifficultyFactor));
      q = cands[0];
    }
  }

  return q || null;
}

// ── safe question payload (no correct answer info) ────────────────────────────
function safeQ(q) {
  return {
    _id:              q._id,
    questionText:     q.questionText,
    imageUrl:         q.imageUrl,
    isMultipleCorrect: q.isMultipleCorrect || false,
    options:          (q.options || []).map((o, i) => ({ _id: o._id, text: o.text, index: i })),
    bloomLevel:       q.bloomLevel,
    difficultyFactor: q.difficultyFactor,
  };
}

// ── bloom stats for a specific level ─────────────────────────────────────────
function bloomStats(answers, level) {
  const subset  = answers.filter((a) => a.bloomLevelAtAnswer === level);
  const correct = subset.filter((a) => a.isCorrect).length;
  return { total: subset.length, correct };
}

// ── shared bloom adaptation logic (used by both exam types) ──────────────────
function adaptBloom(attempt, isCorrect) {
  let diff  = attempt.currentDifficultyFactor;
  let bloom = attempt.currentBloomLevel;

  // Adjust difficulty
  if (isCorrect) diff = Math.min(6, diff + 1);
  else           diff = Math.max(1, diff - 1);

  const bloomIdx = BLOOM_SEQUENCE.indexOf(bloom);
  const { total, correct } = bloomStats(attempt.answers, bloom);

  // Advance bloom
  if (isCorrect && diff > ADVANCE_THRESHOLD && total >= 3 && correct / total >= MASTERY_RATE) {
    if (bloomIdx < BLOOM_SEQUENCE.length - 1) {
      bloom = BLOOM_SEQUENCE[bloomIdx + 1];
      attempt.bloomProgression.push({ level: bloom, questionsAnswered: 0, correctAnswers: 0 });
      diff = 1; // reset difficulty at new level
    }
  }

  // Regress bloom
  if (!isCorrect && diff <= 1 && total >= 3 && correct / total < REGRESS_RATE) {
    if (bloomIdx > 0) {
      bloom = BLOOM_SEQUENCE[bloomIdx - 1];
      diff  = 6; // start at top of previous level
    }
  }

  // Update progression entry for current level
  const entry = attempt.bloomProgression.find((b) => b.level === attempt.currentBloomLevel);
  if (entry) {
    entry.questionsAnswered += 1;
    if (isCorrect) entry.correctAnswers += 1;
  }

  attempt.currentDifficultyFactor = diff;
  attempt.currentBloomLevel       = bloom;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  START ATTEMPT
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/start/:examId', protect, studentOnly, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const now = new Date();
    if (now < exam.startTime) return res.status(400).json({ message: 'This exam has not started yet' });
    if (now > exam.endTime)   return res.status(400).json({ message: 'This exam has ended' });

    const enrollment = await ClassEnrollment.findOne({
      student: req.user._id,
      class:   { $in: exam.assignedClasses },
      isActive: true,
    });
    if (!enrollment)
      return res.status(403).json({ message: 'You are not enrolled in a class assigned to this exam' });

    const done = await Attempt.findOne({
      exam: exam._id, student: req.user._id,
      status: { $in: ['completed','timed_out'] },
    });
    if (done) return res.status(400).json({ message: 'You have already completed this exam' });

    // Resume in-progress attempt
    let attempt = await Attempt.findOne({ exam: exam._id, student: req.user._id, status: 'in_progress' });

    if (!attempt) {
      attempt = await Attempt.create({
        exam:    exam._id,
        student: req.user._id,
        class:   enrollment.class,
        currentBloomLevel:       'Remember',
        currentDifficultyFactor: 1,
        bloomProgression: [{ level: 'Remember', questionsAnswered: 0, correctAnswers: 0 }],
      });
    }

    const nextQ = exam.examType === 'final'
      ? await pickFinal(attempt, exam)
      : await pickAdaptive(attempt, exam);

    if (!nextQ)
      return res.status(400).json({ message: 'No questions available for this exam. Ask your teacher to add questions.' });

    res.json({
      attemptId:               attempt._id,
      examTitle:               exam.title,
      examType:                exam.examType,
      durationMinutes:         exam.durationMinutes,
      totalQuestions:          exam.totalQuestions,
      questionsAnswered:       attempt.answers.length,
      startedAt:               attempt.startedAt,
      currentBloomLevel:       attempt.currentBloomLevel,
      currentDifficultyFactor: attempt.currentDifficultyFactor,
      question:                safeQ(nextQ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SUBMIT ANSWER  →  GET NEXT QUESTION
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/answer/:attemptId', protect, studentOnly, async (req, res) => {
  // selectedOptionIndex  = number   (single-correct)
  // selectedOptionIndices = number[] (multiple-correct) — whichever is provided
  const { questionId, selectedOptionIndex, selectedOptionIndices, timeTakenSeconds } = req.body;

  if (questionId === undefined)
    return res.status(400).json({ message: 'questionId is required' });

  try {
    const attempt = await Attempt.findOne({
      _id: req.params.attemptId, student: req.user._id, status: 'in_progress',
    });
    if (!attempt) return res.status(404).json({ message: 'Active attempt not found' });

    const exam     = await Exam.findById(attempt.exam);
    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    // Time-limit guard
    const elapsed = (Date.now() - attempt.startedAt) / 1000 / 60;
    if (elapsed > exam.durationMinutes)
      return finalizeAttempt(attempt, exam, 'timed_out', res);

    // ── Determine correctness ───────────────────────────────────────────────
    let isCorrect = false;
    let storedSelected;     // what we save in the answer record

    if (question.isMultipleCorrect) {
      const sel  = Array.isArray(selectedOptionIndices) ? selectedOptionIndices : [];
      const cors = question.options
        .map((o, i) => (o.isCorrect ? i : -1))
        .filter((i) => i >= 0);
      isCorrect      = scoreMultiple(sel, cors);
      storedSelected = sel[0] ?? null; // store first for backward compat display
    } else {
      const idx = selectedOptionIndex ?? null;
      const correctIdx = question.options.findIndex((o) => o.isCorrect);
      isCorrect      = idx === correctIdx;
      storedSelected = idx;
    }

    const correctOptions = question.options
      .map((o, i) => (o.isCorrect ? i : -1))
      .filter((i) => i >= 0);

    // ── Record answer ────────────────────────────────────────────────────────
    attempt.answers.push({
      question:             question._id,
      questionTextSnapshot: question.questionText,
      selectedOptionIndex:  storedSelected,
      selectedOptionIndices: question.isMultipleCorrect
        ? (selectedOptionIndices || [])
        : [storedSelected].filter((x) => x !== null),
      correctOptionIndex:   correctOptions[0] ?? 0,
      correctOptionIndices: correctOptions,
      isCorrect,
      bloomLevelAtAnswer:   attempt.currentBloomLevel,
      difficultyAtAnswer:   attempt.currentDifficultyFactor,
      timeTakenSeconds:     timeTakenSeconds || 0,
    });
    attempt.askedQuestionIds.push(question._id);
    attempt.totalTimeTakenSeconds = (attempt.totalTimeTakenSeconds || 0) + (timeTakenSeconds || 0);

    // ── Bloom adaptation (both exam types) ───────────────────────────────────
    adaptBloom(attempt, isCorrect);

    // ── Done? ────────────────────────────────────────────────────────────────
    if (attempt.answers.length >= exam.totalQuestions)
      return finalizeAttempt(attempt, exam, 'completed', res);

    await attempt.save();

    const nextQ = exam.examType === 'final'
      ? await pickFinal(attempt, exam)
      : await pickAdaptive(attempt, exam);

    if (!nextQ) return finalizeAttempt(attempt, exam, 'completed', res);

    res.json({
      isCorrect,
      correctOptionIndex:   correctOptions[0] ?? 0,
      correctOptionIndices: correctOptions,
      explanation:          question.explanation || null,
      questionsAnswered:    attempt.answers.length,
      totalQuestions:       exam.totalQuestions,
      currentBloomLevel:    attempt.currentBloomLevel,
      currentDifficultyFactor: attempt.currentDifficultyFactor,
      question:             safeQ(nextQ),
      isComplete:           false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ── Finalize attempt ──────────────────────────────────────────────────────────
async function finalizeAttempt(attempt, exam, status, res) {
  const total   = attempt.answers.length;
  const correct = attempt.answers.filter((a) => a.isCorrect).length;
  const pct     = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

  const reached = attempt.bloomProgression
    .filter((b) => b.questionsAnswered > 0)
    .map((b) => b.level);

  const finalBloom = reached.length
    ? reached.reduce((best, l) =>
        BLOOM_SEQUENCE.indexOf(l) > BLOOM_SEQUENCE.indexOf(best) ? l : best,
        reached[0])
    : attempt.currentBloomLevel;

  attempt.status             = status;
  attempt.completedAt        = new Date();
  attempt.score              = correct;
  attempt.totalQuestions     = total;
  attempt.correctAnswers     = correct;
  attempt.percentage         = pct;
  attempt.isPassed           = pct >= (exam.passingScore || 40);
  attempt.finalBloomLevel    = finalBloom;

  await attempt.save();

  res.json({
    isComplete:              true,
    attemptId:               attempt._id,
    score:                   correct,
    totalQuestions:          total,
    correctAnswers:          correct,
    percentage:              pct,
    isPassed:                attempt.isPassed,
    finalBloomLevel:         finalBloom,
    totalTimeTakenSeconds:   attempt.totalTimeTakenSeconds,
    status,
    examType:                exam.examType,
  });
}

// ── Force submit ──────────────────────────────────────────────────────────────
router.post('/submit/:attemptId', protect, studentOnly, async (req, res) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.attemptId, student: req.user._id, status: 'in_progress',
    });
    if (!attempt) return res.status(404).json({ message: 'Active attempt not found' });
    const exam = await Exam.findById(attempt.exam);
    await finalizeAttempt(attempt, exam, 'completed', res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get result ────────────────────────────────────────────────────────────────
router.get('/result/:attemptId', protect, async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.attemptId)
      .populate('exam', 'title durationMinutes passingScore examType subject examCode')
      .populate('answers.question', 'questionText options explanation bloomLevel difficultyFactor isMultipleCorrect')
      .lean();
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    const isOwner = attempt.student.toString() === req.user._id.toString();
    const exam    = await Exam.findById(attempt.exam?._id || attempt.exam);
    const isTeacher = exam && exam.teacher.toString() === req.user._id.toString();
    if (!isOwner && !isTeacher)
      return res.status(403).json({ message: 'Access denied' });

    res.json(attempt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── All my completed attempts ──────────────────────────────────────────────────
router.get('/my/all', protect, studentOnly, async (req, res) => {
  try {
    let attempts = await Attempt.find({
      student: req.user._id,
      status:  { $in: ['completed','timed_out'] },
    })
      .populate('exam',  'title durationMinutes startTime examType')
      .populate('class', 'name')
      .sort({ completedAt: -1 })
      .lean();

    if (req.query.examType)
      attempts = attempts.filter((a) => a.exam?.examType === req.query.examType);

    res.json(attempts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
