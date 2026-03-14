import { pool } from '../config/db.js';

async function findCart({ userId, sessionId }) {
  if (userId) {
    const [rows] = await pool.query(
      'SELECT id FROM carts WHERE user_id = ? LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  }
  if (sessionId) {
    const [rows] = await pool.query(
      'SELECT id FROM carts WHERE session_id = ? LIMIT 1',
      [sessionId]
    );
    return rows[0] || null;
  }
  return null;
}

async function createCart({ userId, sessionId }) {
  const [result] = await pool.query(
    'INSERT INTO carts (user_id, session_id) VALUES (?, ?)',
    [userId || null, sessionId || null]
  );
  return { id: result.insertId };
}

async function getCartItems(cartId) {
  const [rows] = await pool.query(
    `SELECT ci.id, ci.quantity, p.id AS product_id, p.slug, p.name, p.price, p.discount_price,
            p.image, p.origin, p.cocoa_percentage, p.weight_grams
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ?`,
    [cartId]
  );
  return rows;
}

async function getCartByItemOwnership({ itemId, userId, sessionId }) {
  const [rows] = await pool.query(
    `SELECT c.id, c.user_id, c.session_id
     FROM cart_items ci
     JOIN carts c ON c.id = ci.cart_id
     WHERE ci.id = ?
     LIMIT 1`,
    [itemId]
  );

  const cart = rows[0] || null;
  if (!cart) {
    return null;
  }

  if (userId && Number(cart.user_id) === Number(userId)) {
    return cart;
  }

  if (!userId && sessionId && cart.session_id === sessionId) {
    return cart;
  }

  const err = new Error('Cart item not found');
  err.status = 404;
  throw err;
}

export async function getCart({ userId, sessionId }) {
  const cart = await findCart({ userId, sessionId });
  if (!cart) {
    return { id: null, items: [] };
  }
  const items = await getCartItems(cart.id);
  return { id: cart.id, items };
}

export async function addCartItem({ userId, sessionId, productId, quantity = 1 }) {
  let cart = await findCart({ userId, sessionId });
  if (!cart) {
    cart = await createCart({ userId, sessionId });
  }

  const [existing] = await pool.query(
    'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1',
    [cart.id, productId]
  );

  if (existing.length > 0) {
    const newQty = existing[0].quantity + Number(quantity || 1);
    await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, existing[0].id]);
  } else {
    await pool.query(
      'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
      [cart.id, productId, Number(quantity || 1)]
    );
  }

  const items = await getCartItems(cart.id);
  return { id: cart.id, items };
}

export async function updateCartItem({ itemId, quantity, userId, sessionId }) {
  const cart = await getCartByItemOwnership({ itemId, userId, sessionId });
  if (!cart) {
    return { id: null, items: [] };
  }

  const qty = Number(quantity || 0);
  if (qty <= 0) {
    await pool.query('DELETE FROM cart_items WHERE id = ?', [itemId]);
  } else {
    await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [qty, itemId]);
  }

  const items = await getCartItems(cart.id);
  return { id: cart.id, items };
}

export async function removeCartItem({ itemId, userId, sessionId }) {
  const cart = await getCartByItemOwnership({ itemId, userId, sessionId });
  if (!cart) {
    return { id: null, items: [] };
  }

  await pool.query('DELETE FROM cart_items WHERE id = ?', [itemId]);
  const items = await getCartItems(cart.id);
  return { id: cart.id, items };
}

export async function mergeCart({ userId, sessionId }) {
  if (!userId || !sessionId) {
    const err = new Error('userId and sessionId are required');
    err.status = 400;
    throw err;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [guestRows] = await conn.query(
      'SELECT id FROM carts WHERE session_id = ? LIMIT 1',
      [sessionId]
    );
    const guestCart = guestRows[0];

    const [userRows] = await conn.query(
      'SELECT id FROM carts WHERE user_id = ? LIMIT 1',
      [userId]
    );
    let userCart = userRows[0];

    if (!userCart) {
      const [createRes] = await conn.query(
        'INSERT INTO carts (user_id) VALUES (?)',
        [userId]
      );
      userCart = { id: createRes.insertId };
    }

    if (guestCart) {
      const [guestItems] = await conn.query(
        'SELECT product_id, quantity FROM cart_items WHERE cart_id = ?',
        [guestCart.id]
      );

      for (const item of guestItems) {
        const [existing] = await conn.query(
          'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1',
          [userCart.id, item.product_id]
        );

        if (existing.length > 0) {
          const newQty = existing[0].quantity + item.quantity;
          await conn.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, existing[0].id]);
        } else {
          await conn.query(
            'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
            [userCart.id, item.product_id, item.quantity]
          );
        }
      }

      await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [guestCart.id]);
      await conn.query('DELETE FROM carts WHERE id = ?', [guestCart.id]);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const finalCart = await findCart({ userId });
  const items = finalCart ? await getCartItems(finalCart.id) : [];
  return { id: finalCart ? finalCart.id : null, items };
}
