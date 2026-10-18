'use strict';

const express = require('express');
const router = express.Router();

const {
  getAllParticipants,
  getParticipantById,
  updateWishlist,
  deleteParticipant,
  getMyGiftee,
  getMyGifter,
} = require('../controllers/participant.controller');

const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { wishlistValidation } = require('../validators/auth.validators');

// All participant routes require authentication
router.use(authenticate);

// GET /participants — public list (names only, no assignments)
router.get('/', getAllParticipants);

// GET /participants/my-giftee — caller's Secret Santa assignment
router.get('/my-giftee', getMyGiftee);

// GET /participants/my-wishlist-giver — who is getting the caller a gift
router.get('/my-wishlist-giver', getMyGifter);

// GET /participants/:id — own profile only (ownership enforced in controller)
router.get('/:id', getParticipantById);

// PATCH /participants/:id/wishlist — update own wishlist
router.patch('/:id/wishlist', wishlistValidation, updateWishlist);

// DELETE /participants/:id — admin only, pre-draw only
router.delete('/:id', requireAdmin, deleteParticipant);

module.exports = router;
