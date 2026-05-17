import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { hashToken } from '../utils/refreshToken.js';

const REFRESH_COOKIE = 'refresh_token';
const DEMO_USER = {
  firstName: 'Demo',
  lastName: 'Customer',
  email: process.env.DEMO_USER_EMAIL || 'demo.customer@chocolatecrafthouse.local',
  role: 'customer',
  phone: '+1 555 0100',
  address: {
    line1: '24 Cocoa Lane',
    line2: '',
    city: 'Brussels',
    state: 'Brussels',
    postalCode: '1000',
    country: 'Belgium',
  },
};

function buildUser(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    role: row.role,
  };
}

function createRecipientName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ');
}

async function insertRefreshToken(executor, userId, refreshToken) {
  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await executor.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, refreshHash, expiresAt]
  );
}

export async function registerUser({ firstName, lastName, email, password, phone, shippingAddress }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      const err = new Error('Email already registered');
      err.status = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await connection.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, passwordHash, 'customer']
    );

    await connection.query(
      `INSERT INTO addresses (user_id, label, recipient_name, line1, line2, city, state, postal_code, country, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.insertId,
        'Default',
        createRecipientName(firstName, lastName),
        shippingAddress.line1,
        shippingAddress.line2 || null,
        shippingAddress.city,
        shippingAddress.state,
        shippingAddress.postalCode,
        shippingAddress.country,
        phone || null,
      ]
    );

    const user = {
      id: result.insertId,
      email,
      firstName,
      lastName,
      role: 'customer',
    };
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken({ id: user.id });

    await insertRefreshToken(connection, user.id, refreshToken);
    await connection.commit();

    return { user, accessToken, refreshToken };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function loginUser({ email, password }) {
  const [rows] = await pool.query(
    'SELECT id, email, first_name, last_name, password_hash, role FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  const userRow = rows[0];
  if (!userRow) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const match = await bcrypt.compare(password, userRow.password_hash);
  if (!match) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const user = buildUser(userRow);
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken({ id: user.id });

  await insertRefreshToken(pool, user.id, refreshToken);

  return { user, accessToken, refreshToken };
}

export async function loginDemoUser() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE email = ? LIMIT 1',
      [DEMO_USER.email]
    );

    let userRow = rows[0];

    if (!userRow) {
      const passwordHash = await bcrypt.hash(`demo-${Date.now()}`, 10);
      const [result] = await connection.query(
        'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [DEMO_USER.firstName, DEMO_USER.lastName, DEMO_USER.email, passwordHash, DEMO_USER.role]
      );

      userRow = {
        id: result.insertId,
        email: DEMO_USER.email,
        first_name: DEMO_USER.firstName,
        last_name: DEMO_USER.lastName,
        role: DEMO_USER.role,
      };
    } else {
      await connection.query(
        'UPDATE users SET first_name = ?, last_name = ?, role = ? WHERE id = ?',
        [DEMO_USER.firstName, DEMO_USER.lastName, DEMO_USER.role, userRow.id]
      );
      userRow = {
        ...userRow,
        first_name: DEMO_USER.firstName,
        last_name: DEMO_USER.lastName,
        role: DEMO_USER.role,
      };
    }

    await connection.query('DELETE FROM addresses WHERE user_id = ?', [userRow.id]);
    await connection.query('DELETE FROM carts WHERE user_id = ?', [userRow.id]);
    await connection.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userRow.id]);
    await connection.query(
      `INSERT INTO addresses (user_id, label, recipient_name, line1, line2, city, state, postal_code, country, phone)
       VALUES (?, 'Demo address', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userRow.id,
        `${DEMO_USER.firstName} ${DEMO_USER.lastName}`,
        DEMO_USER.address.line1,
        DEMO_USER.address.line2 || null,
        DEMO_USER.address.city,
        DEMO_USER.address.state,
        DEMO_USER.address.postalCode,
        DEMO_USER.address.country,
        DEMO_USER.phone,
      ]
    );

    const user = buildUser(userRow);
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken({ id: user.id });

    await insertRefreshToken(connection, user.id, refreshToken);
    await connection.commit();

    return { user, accessToken, refreshToken };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function refreshAccessToken({ refreshToken }) {
  if (!refreshToken) {
    const err = new Error('Missing refresh token');
    err.status = 401;
    throw err;
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    const e = new Error('Invalid refresh token');
    e.status = 401;
    throw e;
  }

  const refreshHash = hashToken(refreshToken);
  const [rows] = await pool.query(
    'SELECT id, user_id FROM refresh_tokens WHERE token_hash = ? AND user_id = ? LIMIT 1',
    [refreshHash, payload.id]
  );

  if (rows.length === 0) {
    const err = new Error('Refresh token not found');
    err.status = 401;
    throw err;
  }

  await pool.query('DELETE FROM refresh_tokens WHERE id = ?', [rows[0].id]);

  const [userRows] = await pool.query(
    'SELECT id, email, first_name, last_name, role FROM users WHERE id = ? LIMIT 1',
    [payload.id]
  );

  const user = buildUser(userRows[0]);
  const accessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken({ id: user.id });
  await insertRefreshToken(pool, user.id, newRefreshToken);

  return { user, accessToken, refreshToken: newRefreshToken };
}

export async function logoutUser({ refreshToken }) {
  if (!refreshToken) return;
  const refreshHash = hashToken(refreshToken);
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = ?', [refreshHash]);
}

export function getRefreshCookieName() {
  return REFRESH_COOKIE;
}
