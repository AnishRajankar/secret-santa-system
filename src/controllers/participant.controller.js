'use strict';

const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const Draw = require('../models/draw.model');
const { createError } = require('../middleware/error.middleware');

// ─── GET /participants ────────────────────────────────────────────────────────
/**
 * Returns public info (name + joinedAt) for all participants.
 * Intentionally omits email, assignments, and wishlist.
 */
const getAllParticipants = async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    const participants = users.map((u) => u.publicProfile());
    res.json({ success: true, count: participants.length, participants });
  } catch (err) {
    next(err);
  }
};

// ─── GET /participants/:id ────────────────────────────────────────────────────
/**
 * Returns the authenticated user's own full profile.
 * Any attempt to view another user's profile is rejected with 403.
 */
const getParticipantById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Enforce ownership — only own profile is accessible
    if (req.user._id.toString() !== id) {
      return next(createError('You can only view your own profile.', 403));
    }

    const user = await User.findById(id);
    if (!user) return next(createError('Participant not found.', 404));

    res.json({
      success: true,
      participant: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        wishlist: user.wishlist,
        hasGiftee: !!user.giftee,  // don't reveal who; just whether draw has run
        joinedAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /participants/:id/wishlist ─────────────────────────────────────────
/**
 * Allows a user to set or update their own wishlist.
 * The wishlist is visible ONLY to their assigned gifter (see GET /my-giftee).
 */
const updateWishlist = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;

    // Enforce ownership
    if (req.user._id.toString() !== id) {
      return next(createError('You can only update your own wishlist.', 403));
    }

    const user = await User.findByIdAndUpdate(
      id,
      { wishlist: req.body.wishlist },
      { new: true, runValidators: true }
    );
    if (!user) return next(createError('Participant not found.', 404));

    res.json({
      success: true,
      message: 'Wishlist updated.',
      wishlist: user.wishlist,
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /participants/:id ─────────────────────────────────────────────────
/**
 * Admin-only: deletes a participant before the draw has been run.
 * Blocked once the draw is locked or done.
 */
const deleteParticipant = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Block deletion after draw
    const draw = await Draw.findOne();
    if (draw && draw.status !== 'open') {
      return next(createError('Cannot delete participants after the draw has been locked or run.', 403));
    }

    // Prevent admin from deleting themselves if they are the only admin
    const target = await User.findById(id);
    if (!target) return next(createError('Participant not found.', 404));

    if (target.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount <= 1) {
        return next(createError('Cannot delete the only admin account.', 403));
      }
    }

    await User.findByIdAndDelete(id);

    res.json({ success: true, message: 'Participant deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /my-giftee ───────────────────────────────────────────────────────────
/**
 * Returns the caller's giftee name + their wishlist.
 * Never exposes the full assignment list.
 */
const getMyGiftee = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('giftee', 'name wishlist');

    if (!user.giftee) {
      return next(createError('The draw has not been run yet. No assignment exists.', 404));
    }

    res.json({
      success: true,
      giftee: {
        id: user.giftee._id,
        name: user.giftee.name,
        wishlist: user.giftee.wishlist || '(No wishlist provided)',
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /my-wishlist-giver ───────────────────────────────────────────────────
/**
 * Reverse view: tells the caller who is assigned to give THEM a gift.
 * Returns only the gifter's name (not email or ID) to preserve privacy.
 */
const getMyGifter = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('gifter', 'name');

    if (!user.gifter) {
      return next(createError('The draw has not been run yet. No assignment exists.', 404));
    }

    res.json({
      success: true,
      gifter: {
        name: user.gifter.name,
        message: `${user.gifter.name} is getting you a gift! 🎁`,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllParticipants,
  getParticipantById,
  updateWishlist,
  deleteParticipant,
  getMyGiftee,
  getMyGifter,
};
