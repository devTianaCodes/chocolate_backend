import * as paymentsService from '../services/payments.service.js';

export async function createStripeIntent(req, res, next) {
  try {
    const { orderId } = req.body;
    const userId = Number(req.user.id);
    const data = await paymentsService.createStripeIntent({ orderId, userId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function handleStripeWebhook(req, res, next) {
  try {
    let mockPayload = null;

    if (Buffer.isBuffer(req.body)) {
      try {
        mockPayload = JSON.parse(req.body.toString('utf8'));
      } catch (err) {
        mockPayload = null;
      }
    } else if (typeof req.body === 'object') {
      mockPayload = req.body;
    }

    const data = await paymentsService.handleStripeWebhook({
      rawBody: req.body,
      signature: req.headers['stripe-signature'],
      mockPayload,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
