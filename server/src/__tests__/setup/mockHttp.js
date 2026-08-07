import { vi } from 'vitest';

export function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    cookies: [],
    clearedCookies: [],
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    set: vi.fn(() => res),
    json: vi.fn((payload) => {
      res.body = payload;
      return res;
    }),
    cookie: vi.fn((name, value, options) => {
      res.cookies.push({ name, value, options });
      return res;
    }),
    clearCookie: vi.fn((name, options) => {
      res.clearedCookies.push({ name, options });
      return res;
    }),
  };

  return res;
}
