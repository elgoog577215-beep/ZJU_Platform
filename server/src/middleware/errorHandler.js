// Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;
  const message = process.env.NODE_ENV === 'production' && isServerError
    ? 'Internal Server Error'
    : err.message;
  const payload = {
    error: message,
  };

  if (err.code) {
    payload.code = err.code;
  }

  if (err.details || err.errors) {
    payload.details = err.details || err.errors;
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
