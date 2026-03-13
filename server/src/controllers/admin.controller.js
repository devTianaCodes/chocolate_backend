import * as adminService from '../services/admin.service.js';

export async function listProducts(req, res, next) {
  try {
    const data = await adminService.listAdminProducts();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const data = await adminService.createAdminProduct(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = await adminService.updateAdminProduct({ id, payload: req.body });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateInventory(req, res, next) {
  try {
    const productId = Number(req.params.productId);
    const { quantity } = req.body;
    const data = await adminService.updateAdminInventory({ productId, quantity });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listOrders(req, res, next) {
  try {
    const data = await adminService.listAdminOrders();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const data = await adminService.updateAdminOrderStatus({ id, status });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
