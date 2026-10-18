'use strict';

const mongoose = require('mongoose');

/**
 * Draw schema — singleton document that tracks the draw state.
 *
 * States:
 *   'open'   → accepting new participants (default)
 *   'locked' → manually locked by admin; no new joins allowed
 *   'done'   → draw has been run; assignments exist
 */
const drawSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['open', 'locked', 'done'],
      default: 'open',
    },
    runAt: {
      type: Date,
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    /**
     * Snapshot of participant count at draw time.
     * Useful for auditing without exposing pairings.
     */
    participantCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Draw = mongoose.model('Draw', drawSchema);

module.exports = Draw;
