export async function createStripeIntent(req, res) {
  res.status(501).json({ success: false, error: 'Stripe intent not implemented' });
}

export async function handleStripeWebhook(req, res) {
  res.status(501).json({ success: false, error: 'Stripe webhook not implemented' });
}
