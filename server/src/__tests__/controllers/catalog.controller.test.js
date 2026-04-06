import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../setup/mockHttp.js';

const listProducts = vi.fn();
const getProductBySlug = vi.fn();
const listCategories = vi.fn();
const getProductsByCategorySlug = vi.fn();
const getCart = vi.fn();
const addCartItem = vi.fn();
const updateCartItem = vi.fn();
const removeCartItem = vi.fn();
const mergeCart = vi.fn();

vi.mock('../../services/products.service.js', () => ({
  listProducts,
  getProductBySlug,
}));

vi.mock('../../services/categories.service.js', () => ({
  listCategories,
  getProductsByCategorySlug,
}));

vi.mock('../../services/cart.service.js', () => ({
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  mergeCart,
}));

const productsController = await import('../../controllers/products.controller.js');
const categoriesController = await import('../../controllers/categories.controller.js');
const cartController = await import('../../controllers/cart.controller.js');

describe('catalog controllers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a 404 when a product slug is not found', async () => {
    getProductBySlug.mockResolvedValue(null);
    const req = { params: { slug: 'missing-product' } };
    const res = createMockResponse();
    const next = vi.fn();

    await productsController.getBySlug(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ success: false, error: 'Product not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns category products when the category exists', async () => {
    getProductsByCategorySlug.mockResolvedValue({
      category: { id: 1, name: 'Dark', slug: 'dark' },
      products: [{ id: 2, name: 'Dark Bar' }],
    });
    const req = { params: { slug: 'dark' } };
    const res = createMockResponse();
    const next = vi.fn();

    await categoriesController.productsByCategory(req, res, next);

    expect(res.body).toEqual({
      success: true,
      data: {
        category: { id: 1, name: 'Dark', slug: 'dark' },
        products: [{ id: 2, name: 'Dark Bar' }],
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects add-item requests without product ownership context', async () => {
    const req = { user: null, body: { quantity: 2 } };
    const res = createMockResponse();
    const next = vi.fn();

    await cartController.addItem(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      success: false,
      error: 'productId and userId or sessionId required',
    });
    expect(addCartItem).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('passes session cart updates through to the cart service', async () => {
    updateCartItem.mockResolvedValue({
      id: 15,
      items: [{ id: 9, quantity: 3 }],
    });
    const req = {
      params: { id: '9' },
      body: { quantity: 3, sessionId: 'guest-1' },
      query: {},
      user: null,
    };
    const res = createMockResponse();
    const next = vi.fn();

    await cartController.updateItem(req, res, next);

    expect(updateCartItem).toHaveBeenCalledWith({
      itemId: 9,
      quantity: 3,
      userId: null,
      sessionId: 'guest-1',
    });
    expect(res.body.success).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it('merges carts for the authenticated user', async () => {
    mergeCart.mockResolvedValue({ id: 10, items: [] });
    const req = {
      user: { id: 7 },
      body: { sessionId: 'guest-2' },
    };
    const res = createMockResponse();
    const next = vi.fn();

    await cartController.mergeCart(req, res, next);

    expect(mergeCart).toHaveBeenCalledWith({ userId: 7, sessionId: 'guest-2' });
    expect(res.body).toEqual({ success: true, data: { id: 10, items: [] } });
    expect(next).not.toHaveBeenCalled();
  });
});
