const mongoose = require('mongoose');

const classEnrollmentSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index: a student can only be in a class once
classEnrollmentSchema.index({ class: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('ClassEnrollment', classEnrollmentSchema);
