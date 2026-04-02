import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/db.js', async () => {
  const helpers = await import('../setup/mockDb.js');
  return { pool: helpers.mockPool };
});

vi.mock('../../utils/orderNumber.js', () => ({
  generateOrderNumber: vi.fn(() => 'CH-TEST-1'),
}));

const { mockConnection, queueConnectionQueries, resetMockDb } = await import('../setup/mockDb.js');
const ordersService = await import('../../services/orders.service.js');

describe('orders.service', () => {
  beforeEach(() => {
    resetMockDb();
  });

  it('creates an order, deducts stock, and clears the cart', async () => {
    queueConnectionQueries(
      [[{ id: 20 }]],
      [[
        {
          product_id: 8,
          quantity: 2,
          name: 'Offer Bar',
          price: '10.00',
          discount_price: '8.00',
          image: '/img.png',
          stock: 10,
        },
      ]],
      [[{ price: '4.50' }]],
      [{ insertId: 55 }],
      [{}],
      [{}],
      [{}]
    );

    const result = await ordersService.createOrder({
      userId: 3,
      sessionId: null,
      shippingAddress: { city: 'Paris' },
      shippingMethodId: 2,
    });

    expect(mockConnection.beginTransaction).toHaveBeenCalled();
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(result.orderId).toBe(55);
    expect(result.orderNumber).toBe('CH-TEST-1');
    expect(result.total).toBe(20.5);
  });

  it('rolls back when stock is insufficient', async () => {
    queueConnectionQueries(
      [[{ id: 20 }]],
      [[
        {
          product_id: 8,
          quantity: 4,
          name: 'Offer Bar',
          price: '10.00',
          discount_price: '0.00',
          image: '/img.png',
          stock: 2,
        },
      ]]
    );

    await expect(
      ordersService.createOrder({
        userId: 3,
        sessionId: null,
        shippingAddress: {},
      })
    ).rejects.toMatchObject({
      message: 'Insufficient stock for product 8',
      status: 400,
    });

    expect(mockConnection.rollback).toHaveBeenCalled();
  });
});
