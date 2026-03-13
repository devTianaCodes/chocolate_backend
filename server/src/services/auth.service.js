import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { hashToken } from '../utils/refreshToken.js';

const REFRESH_COOKIE = 'refresh_token';

export async function registerUser({ email, password }) {
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length > 0) {
    const err = new Error('Email already registered');
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    [email, passwordHash, 'customer']
  );

  const user = { id: result.insertId, email, role: 'customer' };
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken({ id: user.id });

  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user.id, refreshHash, expiresAt]
  );

  return { user, accessToken, refreshToken };
}

export async function loginUser({ email, password }) {
  const [rows] = await pool.query(
    'SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
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

  const user = { id: userRow.id, email: userRow.email, role: userRow.role };
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken({ id: user.id });

  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user.id, refreshHash, expiresAt]
  );

  return { user, accessToken, refreshToken };
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

  // Rotate refresh token
  await pool.query('DELETE FROM refresh_tokens WHERE id = ?', [rows[0].id]);

  const [userRows] = await pool.query(
    'SELECT id, email, role FROM users WHERE id = ? LIMIT 1',
    [payload.id]
  );

  const user = userRows[0];
  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const newRefreshToken = signRefreshToken({ id: user.id });
  const newRefreshHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user.id, newRefreshHash, expiresAt]
  );

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
