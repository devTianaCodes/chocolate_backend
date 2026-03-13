export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: status === 500 ? 'Server error' : err.message,
  });
}
