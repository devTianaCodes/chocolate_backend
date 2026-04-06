import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../app.js';
import { pool, testConnection } from '../../config/db.js';

const runDbIntegration = process.env.RUN_DB_INTEGRATION_TESTS === 'true';

describe.runIf(runDbIntegration)('db integration routes', () => {
  beforeAll(async () => {
    await testConnection();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('serves seeded categories from the real database', async () => {
    const [rows] = await pool.query('SELECT id, name, slug FROM categories ORDER BY name ASC');
    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBe(rows.length);
    expect(response.body.data[0]).toMatchObject({
      id: rows[0].id,
      name: rows[0].name,
      slug: rows[0].slug,
    });
  });

  it('serves active products from the real database', async () => {
    const [rows] = await pool.query(
      `SELECT p.id, p.slug, p.name
       FROM products p
       WHERE p.is_active = 1
       ORDER BY p.created_at DESC
       LIMIT 5`
    );
    const response = await request(app).get('/api/products?limit=5');

    expect(response.status).toBe(200);
    expect(response.body.data.result.length).toBe(rows.length);
    expect(response.body.data.result.map((product) => product.id)).toEqual(rows.map((row) => row.id));
  });

  it('serves products for a real category slug', async () => {
    const [[category]] = await pool.query(
      `SELECT c.id, c.name, c.slug
       FROM categories c
       WHERE EXISTS (
         SELECT 1 FROM products p WHERE p.category_id = c.id AND p.is_active = 1
       )
       ORDER BY c.name ASC
       LIMIT 1`
    );

    expect(category).toBeTruthy();

    const [products] = await pool.query(
      `SELECT p.id
       FROM products p
       WHERE p.category_id = ? AND p.is_active = 1
       ORDER BY p.created_at DESC`,
      [category.id]
    );

    const response = await request(app).get(`/api/categories/${category.slug}/products`);

    expect(response.status).toBe(200);
    expect(response.body.data.category).toMatchObject(category);
    expect(response.body.data.products.map((product) => product.id)).toEqual(
      products.map((product) => product.id)
    );
  });
});
