'use strict';

const mongoose = require('mongoose');
const User = require('../models/user.model');
const Draw = require('../models/draw.model');
const { generateDraw } = require('../utils/draw.utils');
const { createError } = require('../middleware/error.middleware');

// ─── GET /draw/status ─────────────────────────────────────────────────────────
/**
 * Returns the current draw status and participant count.
 * Safe to expose to all authenticated users.
 */
const getDrawStatus = async (_req, res, next) => {
  try {
    let draw = await Draw.findOne();
    const participantCount = await User.countDocuments();
    const minParticipants = parseInt(process.env.MIN_PARTICIPANTS || '3', 10);

    if (!draw) {
      draw = { status: 'open', runAt: null, lockedAt: null };
    }

    res.json({
      success: true,
      draw: {
        status: draw.status,
        participantCount,
        minParticipants,
        canRunDraw: draw.status !== 'done' && participantCount >= minParticipants,
        runAt: draw.runAt,
        lockedAt: draw.lockedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /draw/lock ──────────────────────────────────────────────────────────
/**
 * Admin-only: Manually lock the draw to prevent new signups.
 * Can be called before POST /draw/run to close registrations early.
 * Idempotent if already locked.
 */
const lockDraw = async (_req, res, next) => {
  try {
    let draw = await Draw.findOne();
    if (!draw) draw = await Draw.create({});

    if (draw.status === 'done') {
      return next(createError('Draw has already been run — cannot change lock state.', 400));
    }

    if (draw.status === 'locked') {
      return res.json({ success: true, message: 'Draw is already locked.', draw });
    }

    draw.status = 'locked';
    draw.lockedAt = new Date();
    await draw.save();

    res.json({ success: true, message: 'Draw locked. No new participants may join.', draw });
  } catch (err) {
    next(err);
  }
};

// ─── POST /draw/run ───────────────────────────────────────────────────────────
/**
 * Admin-only: Generate Secret Santa assignments.
 *
 * Guards:
 *  - Draw must not already be 'done'
 *  - At least MIN_PARTICIPANTS users must exist
 *  - Exactly 2 participants is blocked (impossible without mutual pair)
 *
 * The algorithm (Sattolo + mutual-pair fix) guarantees:
 *  - No self-assignments
 *  - No mutual pairs (A→B and B→A cannot both occur)
 *
 * Assignments are written atomically using a Mongoose session transaction.
 * The draw status is set to 'done' and locked to prevent re-running.
 */
const runDraw = async (_req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let draw = await Draw.findOne().session(session);
    if (!draw) draw = await Draw.create([{}], { session }).then((d) => d[0]);

    if (draw.status === 'done') {
      await session.abortTransaction();
      return next(createError('Draw has already been run.', 400));
    }

    const users = await User.find({}, '_id').session(session).lean();
    const minParticipants = parseInt(process.env.MIN_PARTICIPANTS || '3', 10);

    if (users.length < minParticipants) {
      await session.abortTransaction();
      return next(
        createError(
          `Not enough participants. Need at least ${minParticipants}, currently have ${users.length}.`,
          400
        )
      );
    }

    if (users.length === 2) {
      await session.abortTransaction();
      return next(
        createError(
          'Cannot run draw with exactly 2 participants — any valid derangement would be a mutual pair.',
          400
        )
      );
    }

    // Generate derangement with no mutual pairs
    const ids = users.map((u) => u._id.toString());
    const assignments = generateDraw(ids); // Map<gifterId, gifteeId>

    if (!assignments) {
      await session.abortTransaction();
      return next(createError('Failed to generate a valid draw. Please try again.', 500));
    }

    // Build bulk write ops: set giftee and gifter for each participant
    const gifterOf = new Map(); // gifteeId → gifterId
    for (const [gifterId, gifteeId] of assignments.entries()) {
      gifterOf.set(gifteeId, gifterId);
    }

    const bulkOps = ids.map((id) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: {
          $set: {
            giftee: new mongoose.Types.ObjectId(assignments.get(id)),
            gifter: new mongoose.Types.ObjectId(gifterOf.get(id)),
          },
        },
      },
    }));

    await User.bulkWrite(bulkOps, { session });

    draw.status = 'done';
    draw.runAt = new Date();
    draw.lockedAt = draw.lockedAt || new Date();
    draw.participantCount = users.length;
    await draw.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: `🎅 Draw complete! ${users.length} participants assigned. Each person can now check /my-giftee.`,
      participantCount: users.length,
      runAt: draw.runAt,
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

module.exports = { getDrawStatus, lockDraw, runDraw };
