export async function list(req, res) {
  res.status(501).json({ success: false, error: 'Products list not implemented' });
}

export async function getBySlug(req, res) {
  res.status(501).json({ success: false, error: 'Product detail not implemented' });
}
