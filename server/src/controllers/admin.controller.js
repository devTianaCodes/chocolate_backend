export async function listProducts(req, res) {
  res.status(501).json({ success: false, error: 'Admin products not implemented' });
}

export async function createProduct(req, res) {
  res.status(501).json({ success: false, error: 'Admin create product not implemented' });
}

export async function updateProduct(req, res) {
  res.status(501).json({ success: false, error: 'Admin update product not implemented' });
}

export async function updateInventory(req, res) {
  res.status(501).json({ success: false, error: 'Admin update inventory not implemented' });
}

export async function listOrders(req, res) {
  res.status(501).json({ success: false, error: 'Admin list orders not implemented' });
}

export async function updateOrderStatus(req, res) {
  res.status(501).json({ success: false, error: 'Admin update order status not implemented' });
}
