import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listProducts: vi.fn(),
  getProductBySlug: vi.fn(),
  listCategories: vi.fn(),
  getProductsByCategorySlug: vi.fn(),
  getCart: vi.fn(),
  addCartItem: vi.fn(),
}));

vi.mock('../../services/products.service.js', () => ({
  listProducts: mocks.listProducts,
  getProductBySlug: mocks.getProductBySlug,
}));

vi.mock('../../services/categories.service.js', () => ({
  listCategories: mocks.listCategories,
  getProductsByCategorySlug: mocks.getProductsByCategorySlug,
}));

vi.mock('../../services/cart.service.js', () => ({
  getCart: mocks.getCart,
  addCartItem: mocks.addCartItem,
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  mergeCart: vi.fn(),
}));

async function loadApp() {
  vi.resetModules();
  const module = await import('../../app.js');
  return module.default;
}

describe('catalog integration routes', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it('serves the product list through the public route', async () => {
    mocks.listProducts.mockResolvedValue({
      info: { total: 1, pages: 1, currentPage: 1 },
      result: [{ id: 1, name: 'Dark Bar' }],
    });
    const app = await loadApp();

    const response = await request(app).get('/api/products?page=2&limit=8');

    expect(response.status).toBe(200);
    expect(mocks.listProducts).toHaveBeenCalledWith({ page: '2', limit: '8' });
    expect(response.body.success).toBe(true);
    expect(response.body.data.result).toEqual([{ id: 1, name: 'Dark Bar' }]);
  });

  it('returns a 404 for missing product slugs', async () => {
    mocks.getProductBySlug.mockResolvedValue(null);
    const app = await loadApp();

    const response = await request(app).get('/api/products/missing-slug');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: 'Product not found' });
  });

  it('serves categories and category products through public routes', async () => {
    mocks.listCategories.mockResolvedValue([{ id: 1, slug: 'dark', name: 'Dark' }]);
    mocks.getProductsByCategorySlug.mockResolvedValue({
      category: { id: 1, slug: 'dark', name: 'Dark' },
      products: [{ id: 2, name: 'Dark Truffle' }],
    });
    const app = await loadApp();

    const categoriesResponse = await request(app).get('/api/categories');
    const categoryProductsResponse = await request(app).get('/api/categories/dark/products');

    expect(categoriesResponse.status).toBe(200);
    expect(categoriesResponse.body.data).toEqual([{ id: 1, slug: 'dark', name: 'Dark' }]);
    expect(categoryProductsResponse.status).toBe(200);
    expect(categoryProductsResponse.body.data.products).toEqual([{ id: 2, name: 'Dark Truffle' }]);
  });

  it('serves a guest cart and adds items via session id', async () => {
    mocks.getCart.mockResolvedValue({ id: 21, items: [] });
    mocks.addCartItem.mockResolvedValue({
      id: 21,
      items: [{ id: 4, product_id: 8, quantity: 2 }],
    });
    const app = await loadApp();

    const getResponse = await request(app).get('/api/cart').query({ sessionId: 'guest-1' });
    const addResponse = await request(app)
      .post('/api/cart/items')
      .send({ sessionId: 'guest-1', productId: 8, quantity: 2 });

    expect(getResponse.status).toBe(200);
    expect(mocks.getCart).toHaveBeenCalledWith({ userId: null, sessionId: 'guest-1' });
    expect(addResponse.status).toBe(200);
    expect(mocks.addCartItem).toHaveBeenCalledWith({
      userId: null,
      sessionId: 'guest-1',
      productId: 8,
      quantity: 2,
    });
  });

  it('rejects admin routes without authentication', async () => {
    const app = await loadApp();

    const response = await request(app).get('/api/admin/products');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, error: 'Unauthorized' });
  });
});
