import { describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../setup/mockHttp.js';
import { adminOnly } from '../../middleware/adminOnly.js';

describe('adminOnly middleware', () => {
  it('rejects requests when no admin user is present', () => {
    const req = { user: { id: 3, role: 'customer' } };
    const res = createMockResponse();
    const next = vi.fn();

    adminOnly(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({ success: false, error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows admin users through', () => {
    const req = { user: { id: 1, role: 'admin' } };
    const res = createMockResponse();
    const next = vi.fn();

    adminOnly(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
