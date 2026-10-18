'use strict';

/**
 * Centralized 404 handler — catches requests to undefined routes.
 */
const notFound = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Global error handler.
 * Express identifies error handlers by their 4-parameter signature (err, req, res, next).
 *
 * Handled cases:
 *  - Mongoose CastError (invalid ObjectId)  → 400
 *  - Mongoose ValidationError               → 400
 *  - Mongoose duplicate key (code 11000)    → 409
 *  - All others                             → 500
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose: bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose: validation errors (collect all messages)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // MongoDB: duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${statusCode} – ${message}`, err.stack);
  }

  res.status(statusCode).json({ success: false, message });
};

/**
 * Helper to create a consistent API error.
 * Attach `statusCode` so the global handler picks it up correctly.
 */
const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { notFound, errorHandler, createError };
