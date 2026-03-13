import { pool } from '../config/db.js';

export async function listProducts({ page = 1, limit = 12 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 12));
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT p.id, p.slug, p.name, p.description, p.price, p.discount_price, p.image,
            p.origin, p.cocoa_percentage, p.weight_grams, p.is_active, p.created_at,
            c.name AS category_name, c.slug AS category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = 1
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [safeLimit, offset]
  );

  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM products WHERE is_active = 1'
  );

  return {
    info: {
      total,
      pages: Math.ceil(total / safeLimit),
      currentPage: safePage,
    },
    result: rows,
  };
}

export async function getProductBySlug(slug) {
  const [rows] = await pool.query(
    `SELECT p.id, p.slug, p.name, p.description, p.price, p.discount_price, p.image,
            p.origin, p.cocoa_percentage, p.weight_grams, p.is_active, p.created_at,
            c.name AS category_name, c.slug AS category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.slug = ? AND p.is_active = 1
     LIMIT 1`,
    [slug]
  );

  return rows[0] || null;
}
