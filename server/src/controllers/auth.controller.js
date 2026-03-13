import * as authService from '../services/auth.service.js';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/'
  };
}

export async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const { user, accessToken, refreshToken } = await authService.registerUser({ email, password });
    res.cookie(authService.getRefreshCookieName(), refreshToken, cookieOptions());
    res.json({ success: true, data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const { user, accessToken, refreshToken } = await authService.loginUser({ email, password });
    res.cookie(authService.getRefreshCookieName(), refreshToken, cookieOptions());
    res.json({ success: true, data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.[authService.getRefreshCookieName()];
    const { user, accessToken, refreshToken: newRefresh } = await authService.refreshAccessToken({ refreshToken });
    res.cookie(authService.getRefreshCookieName(), newRefresh, cookieOptions());
    res.json({ success: true, data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.[authService.getRefreshCookieName()];
    await authService.logoutUser({ refreshToken });
    res.clearCookie(authService.getRefreshCookieName(), { path: '/' });
    res.json({ success: true, data: { loggedOut: true } });
  } catch (err) {
    next(err);
  }
}
