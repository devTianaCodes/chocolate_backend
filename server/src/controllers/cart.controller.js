import * as cartService from '../services/cart.service.js';

export async function getCart(req, res, next) {
  try {
    const userId = req.user?.id ? Number(req.user.id) : null;
    const sessionId = req.query.sessionId || null;
    const data = await cartService.getCart({ userId, sessionId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function addItem(req, res, next) {
  try {
    const userId = req.user?.id ? Number(req.user.id) : null;
    const { sessionId, productId, quantity } = req.body;
    if (!productId || (!userId && !sessionId)) {
      return res.status(400).json({ success: false, error: 'productId and userId or sessionId required' });
    }
    const data = await cartService.addCartItem({ userId, sessionId, productId, quantity });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req, res, next) {
  try {
    const { quantity } = req.body;
    const userId = req.user?.id ? Number(req.user.id) : null;
    const sessionId = req.body.sessionId || req.query.sessionId || null;
    const itemId = Number(req.params.id);
    const data = await cartService.updateCartItem({ itemId, quantity, userId, sessionId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function removeItem(req, res, next) {
  try {
    const userId = req.user?.id ? Number(req.user.id) : null;
    const sessionId = req.body?.sessionId || req.query.sessionId || null;
    const itemId = Number(req.params.id);
    const data = await cartService.removeCartItem({ itemId, userId, sessionId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function mergeCart(req, res, next) {
  try {
    const userId = req.user?.id ? Number(req.user.id) : null;
    const { sessionId } = req.body;
    const data = await cartService.mergeCart({ userId, sessionId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
