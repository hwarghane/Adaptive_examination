const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      maxlength: [100, 'Class name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Auto-generated unique 8-char alphanumeric code
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      length: 8,
    },
    // Full invite URL (set at creation time)
    inviteLink: {
      type: String,
    },
    // QR code as base64 PNG data URL
    qrCode: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subject: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Virtual for student count
classSchema.virtual('studentCount', {
  ref: 'ClassEnrollment',
  localField: '_id',
  foreignField: 'class',
  count: true,
});

classSchema.set('toJSON', { virtuals: true });
classSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Class', classSchema);
