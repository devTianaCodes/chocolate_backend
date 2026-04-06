import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../setup/mockHttp.js';

const listAdminProducts = vi.fn();
const createAdminProduct = vi.fn();
const updateAdminProduct = vi.fn();
const updateAdminInventory = vi.fn();
const listAdminOrders = vi.fn();
const updateAdminOrderStatus = vi.fn();

vi.mock('../../services/admin.service.js', () => ({
  listAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  updateAdminInventory,
  listAdminOrders,
  updateAdminOrderStatus,
}));

const adminController = await import('../../controllers/admin.controller.js');

describe('admin.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a product and returns 201', async () => {
    createAdminProduct.mockResolvedValue({ id: 44 });
    const req = { body: { name: 'New Bar' } };
    const res = createMockResponse();
    const next = vi.fn();

    await adminController.createProduct(req, res, next);

    expect(createAdminProduct).toHaveBeenCalledWith({ name: 'New Bar' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body).toEqual({ success: true, data: { id: 44 } });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes numeric ids when updating inventory and order status', async () => {
    updateAdminInventory.mockResolvedValue({ productId: 12, quantity: 25 });
    updateAdminOrderStatus.mockResolvedValue({ id: 31, status: 'shipped' });
    const inventoryRes = createMockResponse();
    const statusRes = createMockResponse();
    const next = vi.fn();

    await adminController.updateInventory(
      { params: { productId: '12' }, body: { quantity: 25 } },
      inventoryRes,
      next
    );

    await adminController.updateOrderStatus(
      { params: { id: '31' }, body: { status: 'shipped' } },
      statusRes,
      next
    );

    expect(updateAdminInventory).toHaveBeenCalledWith({ productId: 12, quantity: 25 });
    expect(updateAdminOrderStatus).toHaveBeenCalledWith({ id: 31, status: 'shipped' });
    expect(next).not.toHaveBeenCalled();
  });
});
