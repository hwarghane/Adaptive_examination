const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const { protect } = require('../middleware/auth');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const sendValidationError = (res, errors) =>
  res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });

// ─── Student Register ────────────────────────────────────────────────────────
router.post(
  '/register/student',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('college').trim().notEmpty().withMessage('College is required'),
    body('branch').trim().notEmpty().withMessage('Branch is required'),
    body('year').isInt({ min: 1, max: 6 }).withMessage('Year must be between 1 and 6'),
    body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be between 1 and 12'),
    body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { name, email, password, college, branch, year, semester, rollNumber } = req.body;

    try {
      const existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ message: 'An account with this email already exists' });

      const user = await User.create({ name, email, password, role: 'student' });
      await StudentProfile.create({ user: user._id, college, branch, year, semester, rollNumber });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Registration failed', error: err.message });
    }
  }
);

// ─── Teacher Register ────────────────────────────────────────────────────────
router.post(
  '/register/teacher',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('college').trim().notEmpty().withMessage('College/Institution is required'),
    body('department').trim().notEmpty().withMessage('Department is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { name, email, password, college, department } = req.body;

    try {
      const existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ message: 'An account with this email already exists' });

      const user = await User.create({ name, email, password, role: 'teacher' });
      await TeacherProfile.create({ user: user._id, college, department });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Registration failed', error: err.message });
    }
  }
);

// ─── Login (both roles) ───────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Your account has been deactivated' });
      }

      // Load profile
      let profile = null;
      if (user.role === 'student') {
        profile = await StudentProfile.findOne({ user: user._id }).lean();
      } else {
        profile = await TeacherProfile.findOne({ user: user._id }).lean();
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile,
        token: generateToken(user._id, user.role),
      });
    } catch (err) {
      res.status(500).json({ message: 'Login failed', error: err.message });
    }
  }
);

// ─── Get current user ────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  const user = req.user;
  let profile = null;
  if (user.role === 'student') {
    profile = await StudentProfile.findOne({ user: user._id }).lean();
  } else {
    profile = await TeacherProfile.findOne({ user: user._id }).lean();
  }
  res.json({ ...user.toObject(), profile });
});

// ─── Update profile ───────────────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (req.body.name) user.name = req.body.name;
    await user.save();

    let profile;
    if (user.role === 'student') {
      profile = await StudentProfile.findOneAndUpdate(
        { user: user._id },
        {
          college: req.body.college,
          branch: req.body.branch,
          year: req.body.year,
          semester: req.body.semester,
          rollNumber: req.body.rollNumber,
        },
        { new: true, runValidators: true }
      );
    } else {
      profile = await TeacherProfile.findOneAndUpdate(
        { user: user._id },
        { college: req.body.college, department: req.body.department },
        { new: true, runValidators: true }
      );
    }

    res.json({ ...user.toObject(), profile });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
