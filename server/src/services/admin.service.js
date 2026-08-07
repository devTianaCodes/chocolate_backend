import { pool } from '../config/db.js';
import { clearCatalogCache } from '../utils/catalogCache.js';

export async function listAdminProducts() {
  const [rows] = await pool.query(
    `SELECT p.id, p.category_id, p.slug, p.name, p.description, p.price, p.discount_price,
            p.image, p.is_active, p.created_at, c.name AS category_name,
            COALESCE(i.quantity, 0) AS inventory_quantity
     FROM products p
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN inventory i ON i.product_id = p.id
     ORDER BY p.created_at DESC`
  );
  return rows;
}

export async function createAdminProduct(payload) {
  const {
    category_id,
    slug,
    name,
    description,
    price,
    discount_price,
    image,
    origin,
    cocoa_percentage,
    weight_grams,
    is_active = 1,
  } = payload;

  const [result] = await pool.query(
    `INSERT INTO products (category_id, slug, name, description, price, discount_price, image,
                           origin, cocoa_percentage, weight_grams, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category_id,
      slug,
      name,
      description,
      price,
      discount_price,
      image,
      origin || null,
      cocoa_percentage || null,
      weight_grams || null,
      is_active ? 1 : 0,
    ]
  );

  clearCatalogCache();
  return { id: result.insertId };
}

export async function updateAdminProduct({ id, payload }) {
  const fields = [
    'category_id',
    'slug',
    'name',
    'description',
    'price',
    'discount_price',
    'image',
    'origin',
    'cocoa_percentage',
    'weight_grams',
    'is_active',
  ];

  const updates = [];
  const values = [];

  for (const key of fields) {
    if (payload[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(payload[key]);
    }
  }

  if (updates.length === 0) {
    const err = new Error('No fields to update');
    err.status = 400;
    throw err;
  }

  values.push(id);
  await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);
  clearCatalogCache();
  return { id };
}

export async function updateAdminInventory({ productId, quantity }) {
  const [rows] = await pool.query('SELECT product_id FROM inventory WHERE product_id = ?', [productId]);
  if (rows.length === 0) {
    await pool.query('INSERT INTO inventory (product_id, quantity) VALUES (?, ?)', [productId, quantity]);
  } else {
    await pool.query('UPDATE inventory SET quantity = ? WHERE product_id = ?', [quantity, productId]);
  }
  return { productId, quantity };
}

export async function listAdminOrders() {
  const [rows] = await pool.query(
    `SELECT o.id, o.order_number, o.status, o.total, o.created_at, u.email
     FROM orders o
     JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC`
  );
  return rows;
}

export async function updateAdminOrderStatus({ id, status }) {
  await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  return { id, status };
}
