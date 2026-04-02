import { describe, expect, it } from 'vitest';
import { hashToken } from '../../utils/refreshToken.js';

describe('hashToken', () => {
  it('produces a stable sha256 hex hash', () => {
    const first = hashToken('refresh-token');
    const second = hashToken('refresh-token');

    expect(first).toBe(second);
    expect(first).toHaveLength(64);
    expect(first).toMatch(/^[a-f0-9]+$/);
  });

  it('changes when the token changes', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });
});
