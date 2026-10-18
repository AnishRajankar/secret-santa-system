'use strict';

const jwt = require('jsonwebtoken');

/**
 * Signs a JWT for the given user id.
 *
 * @param {string} id  - MongoDB ObjectId string
 * @returns {string}   - signed JWT
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Signs a token, attaches it as an httpOnly cookie, and sends the response.
 *
 * @param {object} res        - Express response object
 * @param {object} user       - Mongoose User document
 * @param {number} statusCode - HTTP status code (200 or 201)
 * @param {string} message    - Human-readable message
 */
const sendTokenResponse = (res, user, statusCode, message) => {
  const token = signToken(user._id.toString());

  const cookieOptions = {
    httpOnly: process.env.COOKIE_HTTP_ONLY !== 'false',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      token, // also returned in body for non-cookie clients
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
};

module.exports = { signToken, sendTokenResponse };
