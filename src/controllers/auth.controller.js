'use strict';

const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const Draw = require('../models/draw.model');
const { sendTokenResponse } = require('../utils/jwt.utils');
const { createError } = require('../middleware/error.middleware');

// ─── POST /auth/signup ────────────────────────────────────────────────────────
/**
 * Register a new participant.
 * The very first registered user is automatically promoted to admin.
 * Registration is blocked once the draw has been locked or run.
 */
const signup = async (req, res, next) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Block new signups if draw is locked or done
    const draw = await Draw.findOne();
    if (draw && draw.status !== 'open') {
      return next(createError('Registrations are closed — the draw has been locked or already run.', 403));
    }

    const { name, email, password } = req.body;

    // Is this the very first user?
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    const user = await User.create({
      name,
      email,
      password,
      isAdmin: isFirstUser,
    });

    // Ensure the Draw document exists
    if (!draw) {
      await Draw.create({});
    }

    sendTokenResponse(res, user, 201, isFirstUser ? 'Signed up as admin!' : 'Signed up successfully!');
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/login ─────────────────────────────────────────────────────────
/**
 * Authenticate an existing user.
 * Returns a JWT in both response body and httpOnly cookie.
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Explicitly select password (it's excluded by default)
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return next(createError('Invalid email or password.', 401));
    }

    sendTokenResponse(res, user, 200, 'Logged in successfully!');
  } catch (err) {
    next(err);
  }
};

// ─── POST /auth/logout ────────────────────────────────────────────────────────
/**
 * Clears the auth cookie and instructs the client to discard its token.
 */
const logout = (_req, res) => {
  res
    .clearCookie('token', { httpOnly: true, sameSite: 'lax' })
    .json({ success: true, message: 'Logged out successfully.' });
};

module.exports = { signup, login, logout };
