/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

/**
 * Not Found Handler
 * Handles 404 errors for undefined routes
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * Global Error Handler
 * Catches all errors and sends appropriate response
 */
function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Get status code
  const statusCode = err.status || err.statusCode || 500;

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  };

  // Handle specific error types
  if (err.code === 'P2002') {
    // Prisma unique constraint violation
    errorResponse.error.message = 'Duplicate entry: This record already exists';
    errorResponse.error.code = 'DUPLICATE_ENTRY';
  } else if (err.code === 'P2025') {
    // Prisma record not found
    errorResponse.error.message = 'Record not found';
    errorResponse.error.code = 'NOT_FOUND';
  } else if (err.name === 'ValidationError') {
    // Validation error
    errorResponse.error.message = err.message;
    errorResponse.error.code = 'VALIDATION_ERROR';
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Custom Error Class
 * For creating application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  AppError
};
