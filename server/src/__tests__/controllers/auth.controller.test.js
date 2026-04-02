import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../setup/mockHttp.js';

const registerUser = vi.fn();
const loginUser = vi.fn();
const refreshAccessToken = vi.fn();
const logoutUser = vi.fn();
const getRefreshCookieName = vi.fn(() => 'refresh_token');

vi.mock('../../services/auth.service.js', () => ({
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getRefreshCookieName,
}));

const authController = await import('../../controllers/auth.controller.js');

describe('auth.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRefreshCookieName.mockReturnValue('refresh_token');
  });

  it('rejects invalid register payloads without calling the service', async () => {
    const req = {
      body: {
        email: 'invalid',
        password: 'short',
        shippingAddress: {},
      },
    };
    const res = createMockResponse();
    const next = vi.fn();

    await authController.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.error).toBeTruthy();
    expect(registerUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('sets the refresh cookie on successful login', async () => {
    loginUser.mockResolvedValue({
      user: { id: 7, email: 'ada@example.com', role: 'customer' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token-value',
    });
    const req = {
      body: {
        email: 'ada@example.com',
        password: 'supersecret',
      },
    };
    const res = createMockResponse();
    const next = vi.fn();

    await authController.login(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token-value',
      expect.objectContaining({ httpOnly: true, path: '/' })
    );
    expect(res.body.success).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });
});
