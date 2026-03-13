import { pool } from '../config/db.js';
import { generateOrderNumber } from '../utils/orderNumber.js';

function calcLinePrice(item) {
  const price = Number(item.discount_price) > 0 ? Number(item.discount_price) : Number(item.price);
  return price * Number(item.quantity);
}

export async function createOrder({ userId, sessionId, shippingAddress, shippingMethodId }) {
  if (!userId) {
    const err = new Error('userId is required');
    err.status = 400;
    throw err;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [cartRows] = await conn.query(
      'SELECT id FROM carts WHERE user_id = ? LIMIT 1',
      [userId]
    );

    let cartId = cartRows[0]?.id || null;
    if (!cartId && sessionId) {
      const [guestRows] = await conn.query(
        'SELECT id FROM carts WHERE session_id = ? LIMIT 1',
        [sessionId]
      );
      cartId = guestRows[0]?.id || null;
    }

    if (!cartId) {
      const err = new Error('Cart not found');
      err.status = 404;
      throw err;
    }

    const [items] = await conn.query(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.discount_price, p.image, i.quantity AS stock
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cartId]
    );

    if (items.length === 0) {
      const err = new Error('Cart is empty');
      err.status = 400;
      throw err;
    }

    for (const item of items) {
      if (item.stock !== null && item.stock < item.quantity) {
        const err = new Error(`Insufficient stock for product ${item.product_id}`);
        err.status = 400;
        throw err;
      }
    }

    const subtotal = items.reduce((sum, item) => sum + calcLinePrice(item), 0);

    let shippingTotal = 0;
    if (shippingMethodId) {
      const [shipRows] = await conn.query(
        'SELECT price FROM shipping_methods WHERE id = ? AND is_active = 1 LIMIT 1',
        [shippingMethodId]
      );
      if (shipRows.length > 0) {
        shippingTotal = Number(shipRows[0].price);
      }
    }

    const discountTotal = 0;
    const total = subtotal + shippingTotal - discountTotal;

    const orderNumber = generateOrderNumber();

    const [orderRes] = await conn.query(
      `INSERT INTO orders (user_id, order_number, status, subtotal, discount_total, shipping_total, total, shipping_address)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [userId, orderNumber, subtotal.toFixed(2), discountTotal.toFixed(2), shippingTotal.toFixed(2), total.toFixed(2), JSON.stringify(shippingAddress || {})]
    );

    const orderId = orderRes.insertId;

    for (const item of items) {
      const unitPrice = Number(item.discount_price) > 0 ? Number(item.discount_price) : Number(item.price);
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity, image)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.name, unitPrice.toFixed(2), item.quantity, item.image]
      );

      if (item.stock !== null) {
        await conn.query(
          'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
          [item.quantity, item.product_id]
        );
      }
    }

    await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

    await conn.commit();

    return { orderId, orderNumber, total };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function listOrders({ userId }) {
  if (!userId) {
    const err = new Error('userId is required');
    err.status = 400;
    throw err;
  }

  const [rows] = await pool.query(
    'SELECT id, order_number, status, total, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

export async function getOrder({ id, userId }) {
  const [rows] = await pool.query(
    'SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1',
    [id, userId]
  );
  const order = rows[0];
  if (!order) return null;

  const [items] = await pool.query(
    'SELECT product_id, name, price, quantity, image FROM order_items WHERE order_id = ?',
    [id]
  );

  return { ...order, items };
}
