'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User / Participant schema.
 *
 * Fields:
 *  - name        : display name shown in the participant list
 *  - email       : unique login credential
 *  - password    : bcrypt-hashed password (never returned in API responses)
 *  - isAdmin     : the very first registered user is set to true automatically
 *  - wishlist    : optional text visible ONLY to the user's assigned gifter
 *  - giftee      : ref to the User this person must buy a gift for (set after draw)
 *  - gifter      : ref to the User assigned to buy THIS user a gift (set after draw)
 *  - joinedAt    : timestamp of registration
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be at most 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned by default queries
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    wishlist: {
      type: String,
      default: '',
      maxlength: [500, 'Wishlist must be at most 500 characters'],
    },
    giftee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    gifter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save hook: hash password ────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance method: compare password ───────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Virtual: public profile (safe to return to the participant list) ─────────
userSchema.methods.publicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    joinedAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
