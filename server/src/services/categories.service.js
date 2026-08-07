import { pool } from '../config/db.js';
import { withCatalogCache } from '../utils/catalogCache.js';
import { normalizeCatalogProduct } from '../utils/catalogImages.js';

export async function listCategories() {
  return withCatalogCache('categories', async () => {
    const [rows] = await pool.query(
      'SELECT id, name, slug FROM categories ORDER BY name ASC'
    );
    return rows;
  });
}

async function loadProductsByCategorySlug(slug) {
  const [categoryRows] = await pool.query(
    'SELECT id, name, slug FROM categories WHERE slug = ? LIMIT 1',
    [slug]
  );

  const category = categoryRows[0];
  if (!category) return null;

  const [products] = await pool.query(
    `SELECT p.id, p.slug, p.name, p.description, p.price, p.discount_price, p.image,
            hover_image.url AS hover_image,
            p.origin, p.cocoa_percentage, p.weight_grams, p.is_active, p.created_at
     FROM products p
     LEFT JOIN (
       SELECT pi.product_id, pi.url
       FROM product_images pi
       JOIN (
         SELECT product_id, MIN(id) AS id
         FROM product_images
         WHERE is_primary = 0
         GROUP BY product_id
       ) first_hover ON first_hover.id = pi.id
     ) hover_image ON hover_image.product_id = p.id
     WHERE p.category_id = ? AND p.is_active = 1
     ORDER BY p.created_at DESC`,
    [category.id]
  );

  return {
    category,
    products: products.map((product) => normalizeCatalogProduct(product, category.slug)),
  };
}

export async function getProductsByCategorySlug(slug) {
  return withCatalogCache(`category-products:${slug}`, () => loadProductsByCategorySlug(slug));
}
