import { describe, expect, it } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../utils/tokens.js';

describe('token utils', () => {
  it('signs and verifies access tokens', () => {
    const token = signAccessToken({ id: 7, role: 'customer' });
    const payload = verifyAccessToken(token);

    expect(payload.id).toBe(7);
    expect(payload.role).toBe('customer');
  });

  it('signs and verifies refresh tokens', () => {
    const token = signRefreshToken({ id: 9 });
    const payload = verifyRefreshToken(token);

    expect(payload.id).toBe(9);
  });

  it('rejects malformed access tokens', () => {
    expect(() => verifyAccessToken('not-a-jwt')).toThrow();
  });
});
