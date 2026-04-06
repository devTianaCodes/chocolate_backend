import { afterEach, describe, expect, it, vi } from 'vitest';

const REQUIRED_BASE = {
  PORT: '3001',
  CLIENT_URL: 'http://localhost:5173',
  DB_HOST: 'localhost',
  DB_PORT: '3306',
  DB_USER: 'root',
  DB_PASSWORD: 'password',
  DB_NAME: 'chocolate_test',
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_ACCESS_EXPIRES: '15m',
  JWT_REFRESH_EXPIRES: '7d',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
};

async function loadFreshEnvModule() {
  vi.resetModules();
  return import('../../config/env.js');
}

describe('env config', () => {
  afterEach(() => {
    Object.entries(REQUIRED_BASE).forEach(([key, value]) => {
      process.env[key] = value;
    });
    delete process.env.SMTP_SERVICE;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
  });

  it('loads successfully with the required base variables only', async () => {
    Object.entries(REQUIRED_BASE).forEach(([key, value]) => {
      process.env[key] = value;
    });
    const { loadEnv } = await loadFreshEnvModule();

    expect(() => loadEnv()).not.toThrow();
  });

  it('rejects partial smtp configuration', async () => {
    Object.entries(REQUIRED_BASE).forEach(([key, value]) => {
      process.env[key] = value;
    });
    process.env.SMTP_SERVICE = 'gmail';
    process.env.SMTP_USER = 'orders@example.com';
    const { loadEnv } = await loadFreshEnvModule();

    expect(() => loadEnv()).toThrow(/SMTP_PASS/);
  });

  it('accepts a complete smtp configuration', async () => {
    Object.entries(REQUIRED_BASE).forEach(([key, value]) => {
      process.env[key] = value;
    });
    process.env.SMTP_SERVICE = 'gmail';
    process.env.SMTP_USER = 'orders@example.com';
    process.env.SMTP_PASS = 'app-password';
    process.env.SMTP_FROM = 'Chocolate Craft House <orders@example.com>';
    const { loadEnv } = await loadFreshEnvModule();

    expect(() => loadEnv()).not.toThrow();
  });
});
