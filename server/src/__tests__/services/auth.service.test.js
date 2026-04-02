import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockConnection, mockPool, queueConnectionQueries, queuePoolQueries, resetMockDb } from '../setup/mockDb.js';

const bcryptHash = vi.fn();
const bcryptCompare = vi.fn();
const signAccessToken = vi.fn();
const signRefreshToken = vi.fn();
const verifyRefreshToken = vi.fn();
const hashToken = vi.fn();

vi.mock('../../config/db.js', async () => {
  const helpers = await import('../setup/mockDb.js');
  return { pool: helpers.mockPool };
});

vi.mock('bcrypt', () => ({
  default: {
    hash: bcryptHash,
    compare: bcryptCompare,
  },
}));

vi.mock('../../utils/tokens.js', () => ({
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
}));

vi.mock('../../utils/refreshToken.js', () => ({
  hashToken,
}));

const authService = await import('../../services/auth.service.js');

describe('auth.service', () => {
  beforeEach(() => {
    resetMockDb();
    bcryptHash.mockReset();
    bcryptCompare.mockReset();
    signAccessToken.mockReset();
    signRefreshToken.mockReset();
    verifyRefreshToken.mockReset();
    hashToken.mockReset();
    signAccessToken.mockReturnValue('access-token');
    signRefreshToken.mockReturnValue('refresh-token');
    hashToken.mockImplementation((value) => `hashed:${value}`);
  });

  it('registers a new user inside a transaction', async () => {
    bcryptHash.mockResolvedValue('password-hash');
    queueConnectionQueries(
      [[]],
      [{ insertId: 41 }],
      [{}],
      [{}]
    );

    const result = await authService.registerUser({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'supersecret',
      phone: '123456',
      shippingAddress: {
        line1: '1 Main St',
        city: 'London',
        state: 'London',
        postalCode: 'N1',
        country: 'UK',
      },
    });

    expect(mockConnection.beginTransaction).toHaveBeenCalled();
    expect(bcryptHash).toHaveBeenCalledWith('supersecret', 10);
    expect(signAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: 41, email: 'ada@example.com', role: 'customer' })
    );
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
    expect(result.user.id).toBe(41);
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('rejects a duplicate email and rolls back the transaction', async () => {
    queueConnectionQueries([[{ id: 1 }]]);

    await expect(
      authService.registerUser({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        password: 'supersecret',
        phone: '',
        shippingAddress: {
          line1: '1 Main St',
          city: 'London',
          state: 'London',
          postalCode: 'N1',
          country: 'UK',
        },
      })
    ).rejects.toMatchObject({ message: 'Email already registered', status: 400 });

    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('logs in an existing user and stores a refresh token', async () => {
    queuePoolQueries(
      [[{ id: 7, email: 'ada@example.com', first_name: 'Ada', last_name: 'Lovelace', password_hash: 'stored', role: 'customer' }]],
      [{}]
    );
    bcryptCompare.mockResolvedValue(true);

    const result = await authService.loginUser({
      email: 'ada@example.com',
      password: 'supersecret',
    });

    expect(bcryptCompare).toHaveBeenCalledWith('supersecret', 'stored');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO refresh_tokens'),
      expect.arrayContaining([7, 'hashed:refresh-token', expect.any(Date)])
    );
    expect(result.user.email).toBe('ada@example.com');
  });

  it('rejects refresh attempts without a token', async () => {
    await expect(authService.refreshAccessToken({ refreshToken: '' })).rejects.toMatchObject({
      message: 'Missing refresh token',
      status: 401,
    });
  });

  it('rotates refresh tokens when the current one is valid', async () => {
    verifyRefreshToken.mockReturnValue({ id: 5 });
    signRefreshToken
      .mockReturnValueOnce('new-refresh-token');
    queuePoolQueries(
      [[{ id: 13, user_id: 5 }]],
      [{}],
      [[{ id: 5, email: 'user@example.com', first_name: 'Test', last_name: 'User', role: 'customer' }]],
      [{}]
    );

    const result = await authService.refreshAccessToken({ refreshToken: 'current-refresh-token' });

    expect(mockPool.query).toHaveBeenCalledWith(
      'DELETE FROM refresh_tokens WHERE id = ?',
      [13]
    );
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(result.user.id).toBe(5);
  });
});
