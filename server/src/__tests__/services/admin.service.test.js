import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockPool, queuePoolQueries, resetMockDb } from '../setup/mockDb.js';

vi.mock('../../config/db.js', async () => {
  const helpers = await import('../setup/mockDb.js');
  return { pool: helpers.mockPool };
});

const adminService = await import('../../services/admin.service.js');

describe('admin.service', () => {
  beforeEach(() => {
    resetMockDb();
  });

  it('lists admin products from the pool query result', async () => {
    queuePoolQueries([[{ id: 1, name: 'Dark Bar' }]]);

    const result = await adminService.listAdminProducts();

    expect(result).toEqual([{ id: 1, name: 'Dark Bar' }]);
    expect(mockPool.query).toHaveBeenCalledOnce();
  });

  it('creates an admin product and returns the inserted id', async () => {
    queuePoolQueries([{ insertId: 18 }]);

    const result = await adminService.createAdminProduct({
      category_id: 2,
      slug: 'new-bar',
      name: 'New Bar',
      description: 'Desc',
      price: 9.95,
      discount_price: 0,
      image: '/new.png',
      origin: '',
      cocoa_percentage: '',
      weight_grams: '',
      is_active: true,
    });

    expect(result).toEqual({ id: 18 });
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO products'),
      [2, 'new-bar', 'New Bar', 'Desc', 9.95, 0, '/new.png', null, null, null, 1]
    );
  });

  it('rejects updates with no editable fields', async () => {
    await expect(adminService.updateAdminProduct({ id: 4, payload: {} })).rejects.toMatchObject({
      message: 'No fields to update',
      status: 400,
    });
  });

  it('updates inventory by inserting when the product has no inventory row', async () => {
    queuePoolQueries([[]], [{}]);

    const result = await adminService.updateAdminInventory({ productId: 3, quantity: 12 });

    expect(result).toEqual({ productId: 3, quantity: 12 });
    expect(mockPool.query).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO inventory (product_id, quantity) VALUES (?, ?)',
      [3, 12]
    );
  });

  it('updates inventory in place when the row already exists', async () => {
    queuePoolQueries([[{ product_id: 7 }]], [{}]);

    const result = await adminService.updateAdminInventory({ productId: 7, quantity: 4 });

    expect(result).toEqual({ productId: 7, quantity: 4 });
    expect(mockPool.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE inventory SET quantity = ? WHERE product_id = ?',
      [4, 7]
    );
  });

  it('updates the admin order status', async () => {
    queuePoolQueries([{}]);

    const result = await adminService.updateAdminOrderStatus({ id: 22, status: 'fulfilled' });

    expect(result).toEqual({ id: 22, status: 'fulfilled' });
    expect(mockPool.query).toHaveBeenCalledWith(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['fulfilled', 22]
    );
  });
});
