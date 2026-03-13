export function adminOnly(req, res, next) {
  return res.status(501).json({
    success: false,
    error: 'Admin middleware not implemented yet',
  });
}
