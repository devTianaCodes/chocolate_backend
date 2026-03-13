export function auth(req, res, next) {
  return res.status(501).json({
    success: false,
    error: 'Auth middleware not implemented yet',
  });
}
