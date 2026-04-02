import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/db.js', async () => {
  const helpers = await import('../setup/mockDb.js');
  return { pool: helpers.mockPool };
});

const { mockConnection, mockPool, queueConnectionQueries, queuePoolQueries, resetMockDb } =
  await import('../setup/mockDb.js');
const cartService = await import('../../services/cart.service.js');

describe('cart.service', () => {
  beforeEach(() => {
    resetMockDb();
  });

  it('adds a new cart item to an existing user cart', async () => {
    queuePoolQueries(
      [[{ id: 10 }]],
      [[]],
      [{}],
      [[{ id: 99, quantity: 2, product_id: 4, name: 'Bar' }]]
    );

    const result = await cartService.addCartItem({
      userId: 7,
      productId: 4,
      quantity: 2,
    });

    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
      [10, 4, 2]
    );
    expect(result.id).toBe(10);
    expect(result.items).toHaveLength(1);
  });

  it('rejects updates for cart items owned by another cart', async () => {
    queuePoolQueries([[{ id: 8, user_id: 99, session_id: null }]]);

    await expect(
      cartService.updateCartItem({ itemId: 15, quantity: 3, userId: 7 })
    ).rejects.toMatchObject({
      message: 'Cart item not found',
      status: 404,
    });
  });

  it('rolls back mergeCart when a transaction step fails', async () => {
    queueConnectionQueries(
      [[{ id: 3 }]],
      [[{ id: 4 }]],
      [[{ product_id: 22, quantity: 1 }]]
    );
    mockConnection.query.mockRejectedValueOnce(new Error('db-failure'));

    await expect(cartService.mergeCart({ userId: 7, sessionId: 'guest-1' })).rejects.toThrow(
      'db-failure'
    );

    expect(mockConnection.beginTransaction).toHaveBeenCalled();
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });
});
