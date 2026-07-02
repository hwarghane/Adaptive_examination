const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    questionTextSnapshot: { type: String },
    // single-correct legacy field (first selected index)
    selectedOptionIndex:   { type: Number, default: null },
    // multi-correct: all selected indices
    selectedOptionIndices: { type: [Number], default: [] },
    // correct answer(s)
    correctOptionIndex:    { type: Number },
    correctOptionIndices:  { type: [Number], default: [] },
    isCorrect:             { type: Boolean, default: false },
    bloomLevelAtAnswer: {
      type: String,
      enum: ['Remember','Understand','Apply','Analyze','Evaluate','Create'],
    },
    difficultyAtAnswer:  { type: Number },
    timeTakenSeconds:    { type: Number, default: 0 },
  },
  { _id: true }
);

const bloomProgressSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
    },
    reachedAt: { type: Date, default: Date.now },
    questionsAnswered: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'timed_out', 'abandoned'],
      default: 'in_progress',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    totalTimeTakenSeconds: {
      type: Number,
      default: 0,
    },
    answers: [answerSchema],
    // Adaptive state
    currentBloomLevel: {
      type: String,
      enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
      default: 'Remember',
    },
    currentDifficultyFactor: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },
    finalBloomLevel: {
      type: String,
      enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
    },
    bloomProgression: [bloomProgressSchema],
    // Score
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    isPassed: {
      type: Boolean,
      default: false,
    },
    // Questions asked (to avoid repeats)
    askedQuestionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
  },
  { timestamps: true }
);

// A student can only have one completed attempt per exam
attemptSchema.index({ exam: 1, student: 1 });

module.exports = mongoose.model('Attempt', attemptSchema);
