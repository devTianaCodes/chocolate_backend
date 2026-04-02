import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadPaymentsService({ stripeSecretKey = 'sk_test_placeholder', webhookSecret = 'whsec_test' } = {}) {
  process.env.STRIPE_SECRET_KEY = stripeSecretKey;
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

  vi.resetModules();

  vi.doMock('../../config/db.js', async () => {
    const helpers = await import('../setup/mockDb.js');
    return { pool: helpers.mockPool };
  });

  const stripeConstructEvent = vi.fn();
  const stripeCreateIntent = vi.fn();

  vi.doMock('stripe', () => ({
    default: class MockStripe {
      constructor() {
        this.paymentIntents = {
          create: stripeCreateIntent,
        };
        this.webhooks = {
          constructEvent: stripeConstructEvent,
        };
      }
    },
  }));

  const helpers = await import('../setup/mockDb.js');
  const service = await import('../../services/payments.service.js');

  return { service, ...helpers, stripeConstructEvent, stripeCreateIntent };
}

describe('payments.service', () => {
  beforeEach(async () => {
    const { resetMockDb } = await import('../setup/mockDb.js');
    resetMockDb();
  });

  it('creates a mock Stripe intent when Stripe is disabled', async () => {
    const { service, queuePoolQueries } = await loadPaymentsService();
    queuePoolQueries(
      [[{ id: 7, user_id: 3, order_number: 'CH-7', total: '18.50', status: 'pending' }]],
      [[]],
      [{ insertId: 91 }]
    );

    const result = await service.createStripeIntent({ orderId: 7, userId: 3 });

    expect(result.mode).toBe('mock');
    expect(result.paymentIntentId).toBe('pi_mock_7');
  });

  it('creates a live Stripe intent when a real key is present', async () => {
    const { service, queuePoolQueries, stripeCreateIntent } = await loadPaymentsService({
      stripeSecretKey: 'sk_test_real',
      webhookSecret: 'whsec_live',
    });
    queuePoolQueries(
      [[{ id: 9, user_id: 3, order_number: 'CH-9', total: '12.00', status: 'pending' }]],
      [[]],
      [{ insertId: 10 }]
    );
    stripeCreateIntent.mockResolvedValue({
      id: 'pi_live_1',
      client_secret: 'secret_live',
      status: 'requires_payment_method',
    });

    const result = await service.createStripeIntent({ orderId: 9, userId: 3 });

    expect(stripeCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1200,
        currency: 'usd',
      })
    );
    expect(result.mode).toBe('stripe');
    expect(result.clientSecret).toBe('secret_live');
  });

  it('handles mock webhooks and marks the order paid', async () => {
    const { service, mockPool, queuePoolQueries } = await loadPaymentsService();
    queuePoolQueries(
      [[{ id: 4, user_id: 3, order_number: 'CH-4', total: '19.00', status: 'pending' }]],
      [[]],
      [{ insertId: 33 }],
      [{}]
    );

    const result = await service.handleStripeWebhook({
      mockPayload: { orderId: 4, paymentIntentId: 'pi_mock_4' },
    });

    expect(result).toEqual({ received: true, mode: 'mock' });
    expect(mockPool.query).toHaveBeenLastCalledWith("UPDATE orders SET status = 'paid' WHERE id = ?", [4]);
  });
});
