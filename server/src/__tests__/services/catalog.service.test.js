import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockPool, queuePoolQueries, resetMockDb } from '../setup/mockDb.js';

vi.mock('../../config/db.js', async () => {
  const helpers = await import('../setup/mockDb.js');
  return { pool: helpers.mockPool };
});

const productsService = await import('../../services/products.service.js');
const categoriesService = await import('../../services/categories.service.js');

describe('catalog services', () => {
  beforeEach(() => {
    resetMockDb();
  });

  it('lists products with normalized pagination info', async () => {
    queuePoolQueries(
      [[{ id: 7, name: 'Dark Bar' }]],
      [[{ total: 21 }]]
    );

    const result = await productsService.listProducts({ page: '2', limit: '8' });

    expect(mockPool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM products p'),
      [8, 8]
    );
    expect(result).toEqual({
      info: { total: 21, pages: 3, currentPage: 2 },
      result: [{ id: 7, name: 'Dark Bar' }],
    });
  });

  it('returns null when a product slug is missing', async () => {
    queuePoolQueries([[]]);

    const result = await productsService.getProductBySlug('missing-slug');

    expect(result).toBeNull();
  });

  it('returns a product with merged primary and gallery images', async () => {
    queuePoolQueries(
      [[{
        id: 9,
        slug: 'dark-bar',
        name: 'Dark Bar',
        image: '/primary.png',
      }]],
      [[
        { url: '/gallery.png', alt_text: 'Gallery', is_primary: 0 },
        { url: '/primary.png', alt_text: 'Duplicate primary', is_primary: 1 },
      ]]
    );

    const result = await productsService.getProductBySlug('dark-bar');

    expect(result.hover_image).toBe('/gallery.png');
    expect(result.images).toEqual([
      { url: '/primary.png', alt_text: 'Dark Bar', is_primary: true },
      { url: '/gallery.png', alt_text: 'Gallery', is_primary: false },
    ]);
  });

  it('returns null when a category slug is missing', async () => {
    queuePoolQueries([[]]);

    const result = await categoriesService.getProductsByCategorySlug('missing-category');

    expect(result).toBeNull();
  });

  it('lists categories ordered by name', async () => {
    queuePoolQueries([[{ id: 3, name: 'Dark', slug: 'dark' }]]);

    const result = await categoriesService.listCategories();

    expect(result).toEqual([{ id: 3, name: 'Dark', slug: 'dark' }]);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, name, slug FROM categories ORDER BY name ASC'
    );
  });

  it('returns category products when the category exists', async () => {
    queuePoolQueries(
      [[{ id: 4, name: 'Gift Boxes', slug: 'gift-boxes' }]],
      [[{ id: 11, name: 'Holiday Box' }]]
    );

    const result = await categoriesService.getProductsByCategorySlug('gift-boxes');

    expect(result).toEqual({
      category: { id: 4, name: 'Gift Boxes', slug: 'gift-boxes' },
      products: [{ id: 11, name: 'Holiday Box' }],
    });
  });
});
