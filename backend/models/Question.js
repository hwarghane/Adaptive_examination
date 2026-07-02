const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text:      { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
});

const BLOOM_DIFFICULTY = {
  Remember: 1, Understand: 2, Apply: 3,
  Analyze: 4, Evaluate: 5, Create: 6,
};

const questionSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questionText: { type: String, required: [true, 'Question text is required'] },
    options: {
      type: [optionSchema],
      validate: {
        validator: (opts) => opts.length >= 2 && opts.length <= 6,
        message: 'A question must have between 2 and 6 options',
      },
    },
    // true = multiple answers allowed; false = single correct only
    isMultipleCorrect: { type: Boolean, default: false },
    explanation: { type: String, default: '' },
    imageUrl:    { type: String },

    bloomLevel: {
      type: String,
      enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
      required: [true, "Bloom's level is required"],
    },
    // Auto-derived from bloomLevel (1-6); never set manually
    difficultyFactor: { type: Number, min: 1, max: 6 },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    topic: { type: String, trim: true, default: '' },

    isActive: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false }, // teacher can hide from exam pool
  },
  { timestamps: true }
);

// Auto-set difficultyFactor from bloomLevel
questionSchema.pre('save', function (next) {
  if (this.bloomLevel) {
    this.difficultyFactor = BLOOM_DIFFICULTY[this.bloomLevel] || 1;
  }
  next();
});

questionSchema.index({ bloomLevel: 1, subject: 1, teacher: 1 });
questionSchema.index({ teacher: 1, isActive: 1, isHidden: 1 });

module.exports = mongoose.model('Question', questionSchema);
