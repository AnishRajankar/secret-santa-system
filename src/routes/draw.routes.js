'use strict';

const express = require('express');
const router = express.Router();

const { getDrawStatus, lockDraw, runDraw } = require('../controllers/draw.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// GET /draw/status — any authenticated user can check the draw state
router.get('/status', authenticate, getDrawStatus);

// POST /draw/lock — admin only: close registrations without running draw
router.post('/lock', authenticate, requireAdmin, lockDraw);

// POST /draw/run — admin only: generate Secret Santa assignments
router.post('/run', authenticate, requireAdmin, runDraw);

module.exports = router;
