import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../setup/mockHttp.js';

const verifyAccessToken = vi.fn();

vi.mock('../../utils/tokens.js', () => ({
  verifyAccessToken,
}));

const { auth } = await import('../../middleware/auth.js');

describe('auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests without a bearer token', () => {
    const req = { headers: {} };
    const res = createMockResponse();
    const next = vi.fn();

    auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid bearer tokens', () => {
    verifyAccessToken.mockImplementation(() => {
      throw new Error('bad token');
    });

    const req = { headers: { authorization: 'Bearer broken-token' } };
    const res = createMockResponse();
    const next = vi.fn();

    auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.error).toBe('Invalid token');
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the user to the request for valid tokens', () => {
    verifyAccessToken.mockReturnValue({ id: 3, role: 'customer' });

    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = createMockResponse();
    const next = vi.fn();

    auth(req, res, next);

    expect(req.user).toEqual({ id: 3, role: 'customer' });
    expect(next).toHaveBeenCalled();
  });
});
