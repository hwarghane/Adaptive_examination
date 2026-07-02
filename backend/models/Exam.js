const mongoose = require('mongoose');
const crypto = require('crypto');

const examSchema = new mongoose.Schema(
  {
    title:       { type: String, required: [true, 'Exam title is required'], trim: true },
    description: { type: String, trim: true, default: '' },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // 'adaptive' | 'final'
    examType: {
      type: String,
      enum: ['adaptive', 'final'],
      default: 'adaptive',
    },

    // Unique 6-char code students enter to access a final exam
    examCode: {
      type: String,
      unique: true,
      sparse: true,     // only enforced when not null
      uppercase: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    topic: { type: String, trim: true, default: '' },

    assignedClasses: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    ],

    totalQuestions:  { type: Number, required: true, min: 1, default: 20 },
    durationMinutes: { type: Number, required: [true, 'Duration is required'], min: 1 },
    startTime: { type: Date, required: true },
    endTime:   { type: Date, required: true },

    bloomLevels: {
      type: [String],
      enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
      default: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
    },

    isPublished: { type: Boolean, default: false },
    passingScore: { type: Number, default: 40, min: 0, max: 100 },
  },
  { timestamps: true }
);

// Validate end > start
examSchema.pre('save', function (next) {
  if (this.endTime <= this.startTime)
    return next(new Error('End time must be after start time'));
  next();
});

examSchema.index({ teacher: 1 });
examSchema.index({ assignedClasses: 1 });
// examCode already has unique:true on the field definition — no separate index needed

// Helper used by route to generate a unique 6-char code
examSchema.statics.generateUniqueCode = async function () {
  let code, exists;
  do {
    code = crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. "A3F9B2"
    exists = await this.findOne({ examCode: code });
  } while (exists);
  return code;
};

module.exports = mongoose.model('Exam', examSchema);
