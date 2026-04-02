import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../setup/mockHttp.js';

const createOrder = vi.fn();
const listOrders = vi.fn();
const getOrder = vi.fn();

vi.mock('../../services/orders.service.js', () => ({
  createOrder,
  listOrders,
  getOrder,
}));

const ordersController = await import('../../controllers/orders.controller.js');

describe('orders.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an order for the authenticated user', async () => {
    createOrder.mockResolvedValue({ orderId: 12, orderNumber: 'CH-12', total: 20 });
    const req = {
      user: { id: '7' },
      body: { sessionId: 'guest-1', shippingAddress: { city: 'Paris' }, shippingMethodId: 2 },
    };
    const res = createMockResponse();
    const next = vi.fn();

    await ordersController.createOrder(req, res, next);

    expect(createOrder).toHaveBeenCalledWith({
      userId: 7,
      sessionId: 'guest-1',
      shippingAddress: { city: 'Paris' },
      shippingMethodId: 2,
    });
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when the order is not found', async () => {
    getOrder.mockResolvedValue(null);
    const req = {
      user: { id: '7' },
      params: { id: '99' },
    };
    const res = createMockResponse();
    const next = vi.fn();

    await ordersController.getOrder(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.error).toBe('Order not found');
    expect(next).not.toHaveBeenCalled();
  });
});
