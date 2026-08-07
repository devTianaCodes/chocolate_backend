import { pool } from '../config/db.js';
import { withCatalogCache } from '../utils/catalogCache.js';
import { catalogImagePath, normalizeCatalogProduct } from '../utils/catalogImages.js';

function getListOptions({ page = 1, limit = 12, sort } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 12));
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    sort: sort === 'popular' ? 'popular' : 'recent',
  };
}

async function loadProductPage({ page, limit, offset, sort }) {
  const orderBy = sort === 'popular' ? '(p.id % 3) DESC, p.id DESC' : 'p.created_at DESC';
  const [productsResult, total] = await Promise.all([
    pool.query(
    `SELECT p.id, p.slug, p.name, p.description, p.price, p.discount_price, p.image,
            hover_image.url AS hover_image,
            p.origin, p.cocoa_percentage, p.weight_grams, p.is_active, p.created_at,
            c.name AS category_name, c.slug AS category_slug
     FROM products p
     JOIN categories c ON c.id = p.category_id
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
     WHERE p.is_active = 1
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [limit, offset]
    ),
    withCatalogCache('active-product-count', async () => {
      const [[result]] = await pool.query(
        'SELECT COUNT(*) AS total FROM products WHERE is_active = 1'
      );
      return result.total;
    }),
  ]);
  const [rows] = productsResult;

  return {
    info: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    },
    result: rows.map((product) => normalizeCatalogProduct(product)),
  };
}

export async function listProducts(input = {}) {
  const options = getListOptions(input);
  const key = `products:${options.page}:${options.limit}:${options.sort}`;
  return withCatalogCache(key, () => loadProductPage(options));
}

async function loadProductBySlug(slug) {
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

  const product = rows[0] ? normalizeCatalogProduct(rows[0]) : null;
  if (!product) return null;

  const [imageRows] = await pool.query(
    `SELECT url, alt_text, is_primary
     FROM product_images
     WHERE product_id = ?
     ORDER BY is_primary DESC, id ASC`,
    [product.id]
  );

  const images = [];
  const seen = new Set();

  const pushImage = (url, altText, isPrimary) => {
    const normalizedUrl = catalogImagePath({
      source: url,
      categorySlug: product.category_slug,
      productName: product.name,
      variant: isPrimary ? 'main' : 'detail',
    });
    if (!normalizedUrl || seen.has(normalizedUrl)) return;
    seen.add(normalizedUrl);
    images.push({
      url: normalizedUrl,
      alt_text: altText || product.name,
      is_primary: Boolean(isPrimary),
    });
  };

  pushImage(product.image, product.name, true);
  imageRows.forEach((image) => {
    pushImage(image.url, image.alt_text, image.is_primary);
  });

  return {
    ...product,
    hover_image: images.find((image) => !image.is_primary)?.url || null,
    images,
  };
}

export async function getProductBySlug(slug) {
  return withCatalogCache(`product:${slug}`, () => loadProductBySlug(slug));
}
