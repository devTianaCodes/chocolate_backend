import * as authService from '../services/auth.service.js';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRegisterPayload(payload) {
  const shippingAddress = payload.shippingAddress || {};
  const required = [
    ['firstName', 'First name required'],
    ['lastName', 'Last name required'],
    ['email', 'Email required'],
    ['password', 'Password required'],
    ['line1', 'Address line 1 required'],
    ['city', 'City required'],
    ['state', 'State / Region required'],
    ['postalCode', 'Postal code required'],
    ['country', 'Country required'],
  ];

  for (const [field, message] of required) {
    const value = field in shippingAddress ? shippingAddress[field] : payload[field];
    if (!String(value || '').trim()) {
      return message;
    }
  }

  if (!isValidEmail(payload.email)) {
    return 'Enter a valid email';
  }

  if (payload.password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  return '';
}

export async function register(req, res, next) {
  try {
    const {
      firstName = '',
      lastName = '',
      email = '',
      password = '',
      phone = '',
      shippingAddress = {},
    } = req.body;

    const error = validateRegisterPayload({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      shippingAddress,
    });

    if (error) {
      return res.status(400).json({ success: false, error });
    }

    const { user, accessToken, refreshToken } = await authService.registerUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      phone: phone.trim(),
      shippingAddress: {
        line1: String(shippingAddress.line1 || '').trim(),
        line2: String(shippingAddress.line2 || '').trim(),
        city: String(shippingAddress.city || '').trim(),
        state: String(shippingAddress.state || '').trim(),
        postalCode: String(shippingAddress.postalCode || '').trim(),
        country: String(shippingAddress.country || '').trim(),
      },
    });

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

export async function demoLogin(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.loginDemoUser();
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
