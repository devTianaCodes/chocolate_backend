import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../setup/mockHttp.js';

const createStripeIntent = vi.fn();
const handleStripeWebhook = vi.fn();

vi.mock('../../services/payments.service.js', () => ({
  createStripeIntent,
  handleStripeWebhook,
}));

const paymentsController = await import('../../controllers/payments.controller.js');

describe('payments.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a Stripe intent for the authenticated user', async () => {
    createStripeIntent.mockResolvedValue({ paymentIntentId: 'pi_1', mode: 'mock' });
    const req = {
      user: { id: '5' },
      body: { orderId: 4 },
    };
    const res = createMockResponse();
    const next = vi.fn();

    await paymentsController.createStripeIntent(req, res, next);

    expect(createStripeIntent).toHaveBeenCalledWith({ orderId: 4, userId: 5 });
    expect(res.body.success).toBe(true);
  });

  it('parses a raw webhook body into mock payload data', async () => {
    handleStripeWebhook.mockResolvedValue({ received: true, mode: 'mock' });
    const req = {
      body: Buffer.from(JSON.stringify({ orderId: 2, paymentIntentId: 'pi_mock_2' })),
      headers: {},
    };
    const res = createMockResponse();
    const next = vi.fn();

    await paymentsController.handleStripeWebhook(req, res, next);

    expect(handleStripeWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        rawBody: expect.any(Buffer),
        mockPayload: { orderId: 2, paymentIntentId: 'pi_mock_2' },
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
