'use strict';

const { body } = require('express-validator');

const signupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
    .isLength({ max: 128 }).withMessage('Password must be at most 128 characters.'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

const wishlistValidation = [
  body('wishlist')
    .optional({ nullable: true })
    .isString().withMessage('Wishlist must be a string.')
    .isLength({ max: 500 }).withMessage('Wishlist must be at most 500 characters.')
    .trim(),
];

module.exports = { signupValidation, loginValidation, wishlistValidation };
