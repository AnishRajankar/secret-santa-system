'use strict';

const express = require('express');
const router = express.Router();
const { signup, login, logout } = require('../controllers/auth.controller');
const { signupValidation, loginValidation } = require('../validators/auth.validators');
const { authenticate } = require('../middleware/auth.middleware');

// POST /auth/signup
router.post('/signup', signupValidation, signup);

// POST /auth/login
router.post('/login', loginValidation, login);

// POST /auth/logout  (auth not strictly required, but good practice)
router.post('/logout', authenticate, logout);

module.exports = router;
