import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadPaymentsService({ stripeSecretKey = 'sk_test_placeholder', webhookSecret = 'whsec_test' } = {}) {
  process.env.STRIPE_SECRET_KEY = stripeSecretKey;
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

  vi.resetModules();

  vi.doMock('../../config/db.js', async () => {
    const helpers = await import('../setup/mockDb.js');
    return { pool: helpers.mockPool };
  });

  const sendOrderConfirmationEmail = vi.fn();
  const sendAdminOrderNotificationEmail = vi.fn();
  vi.doMock('../../services/mail.service.js', () => ({
    sendOrderConfirmationEmail,
    sendAdminOrderNotificationEmail,
  }));

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

  return {
    service,
    ...helpers,
    stripeConstructEvent,
    stripeCreateIntent,
    sendOrderConfirmationEmail,
    sendAdminOrderNotificationEmail,
  };
}

describe('payments.service', () => {
  beforeEach(async () => {
    const { resetMockDb } = await import('../setup/mockDb.js');
    resetMockDb();
    delete process.env.ADMIN_ORDER_EMAIL;
    delete process.env.STORE_ORDER_EMAIL;
    delete process.env.ORDER_CONFIRMATION_RECIPIENT;
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
    const { service, mockPool, queuePoolQueries, sendOrderConfirmationEmail } = await loadPaymentsService();
    queuePoolQueries(
      [[{ id: 4, user_id: 3, order_number: 'CH-4', total: '19.00', status: 'pending', created_at: '2025-01-01 12:00:00', email: 'ada@example.com', first_name: 'Ada', last_name: 'Lovelace' }]],
      [[]],
      [{ insertId: 33 }],
      [{}],
      [[{ name: 'Dark Bar', price: '9.50', quantity: 2, image: '/bar.png' }]]
    );

    const result = await service.handleStripeWebhook({
      mockPayload: { orderId: 4, paymentIntentId: 'pi_mock_4' },
    });

    expect(result).toEqual({ received: true, mode: 'mock' });
    expect(mockPool.query).toHaveBeenCalledWith("UPDATE orders SET status = 'paid' WHERE id = ?", [4]);
    expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.com',
        order: expect.objectContaining({ order_number: 'CH-4' }),
        items: [expect.objectContaining({ name: 'Dark Bar' })],
      })
    );
  });

  it('sends an admin/store notification email when configured', async () => {
    process.env.ADMIN_ORDER_EMAIL = 'store@chocolatecrafthouse.com';

    const {
      service,
      queuePoolQueries,
      sendAdminOrderNotificationEmail,
      sendOrderConfirmationEmail,
    } = await loadPaymentsService();

    queuePoolQueries(
      [[{ id: 5, user_id: 3, order_number: 'CH-5', total: '22.00', status: 'pending', created_at: '2025-01-02 12:00:00', email: 'ada@example.com', first_name: 'Ada', last_name: 'Lovelace' }]],
      [[]],
      [{ insertId: 40 }],
      [{}],
      [[{ name: 'Praline Box', price: '11.00', quantity: 2, image: '/box.png' }]]
    );

    await service.handleStripeWebhook({
      mockPayload: { orderId: 5, paymentIntentId: 'pi_mock_5' },
    });

    expect(sendOrderConfirmationEmail).toHaveBeenCalled();
    expect(sendAdminOrderNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'store@chocolatecrafthouse.com',
        order: expect.objectContaining({ order_number: 'CH-5' }),
        items: [expect.objectContaining({ name: 'Praline Box' })],
      })
    );
  });
});
