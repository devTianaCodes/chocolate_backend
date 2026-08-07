import { pool } from '../config/db.js';
import { normalizeCatalogProduct } from '../utils/catalogImages.js';

export async function listCategories() {
  const [rows] = await pool.query(
    'SELECT id, name, slug FROM categories ORDER BY name ASC'
  );
  return rows;
}

export async function getProductsByCategorySlug(slug) {
  const [categoryRows] = await pool.query(
    'SELECT id, name, slug FROM categories WHERE slug = ? LIMIT 1',
    [slug]
  );

  const category = categoryRows[0];
  if (!category) return null;

  const [products] = await pool.query(
    `SELECT p.id, p.slug, p.name, p.description, p.price, p.discount_price, p.image,
            (
              SELECT pi.url
              FROM product_images pi
              WHERE pi.product_id = p.id AND pi.is_primary = 0
              ORDER BY pi.id ASC
              LIMIT 1
            ) AS hover_image,
            p.origin, p.cocoa_percentage, p.weight_grams, p.is_active, p.created_at
     FROM products p
     WHERE p.category_id = ? AND p.is_active = 1
     ORDER BY p.created_at DESC`,
    [category.id]
  );

  return {
    category,
    products: products.map((product) => normalizeCatalogProduct(product, category.slug)),
  };
}
