const errorHandler = (err, req, res, next) => {
  console.error('Error stack:', err.stack);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // Mongoose/MongoDB errors
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(val => val.message).join(', ');
    error.status = 400;
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        error.message = 'Resource already exists';
        error.status = 409;
        break;
      case '23503': // Foreign key violation
        error.message = 'Referenced resource not found';
        error.status = 400;
        break;
      case '23514': // Check violation
        error.message = 'Invalid data provided';
        error.status = 400;
        break;
      case '42P01': // Undefined table
        error.message = 'Database configuration error';
        error.status = 500;
        break;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.status = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.status = 401;
  }

  // Express validation errors
  if (err.type === 'entity.parse.failed') {
    error.message = 'Invalid JSON payload';
    error.status = 400;
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal Server Error';
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} not found`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
