import * as ordersService from '../services/orders.service.js';

export async function createOrder(req, res, next) {
  try {
    const userId = Number(req.user.id);
    const { sessionId, shippingAddress, shippingMethodId } = req.body;
    const data = await ordersService.createOrder({ userId, sessionId, shippingAddress, shippingMethodId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listOrders(req, res, next) {
  try {
    const userId = Number(req.user.id);
    const data = await ordersService.listOrders({ userId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req, res, next) {
  try {
    const userId = Number(req.user.id);
    const id = Number(req.params.id);
    const data = await ordersService.getOrder({ id, userId });
    if (!data) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
