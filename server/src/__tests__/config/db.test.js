import { beforeEach, describe, expect, it, vi } from 'vitest';

const getConnection = vi.fn();
const release = vi.fn();
const createPool = vi.fn(() => ({ getConnection }));

vi.mock('mysql2/promise', () => ({
  default: {
    createPool,
  },
}));

describe('db config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConnection.mockResolvedValue({ release });
  });

  it('creates the pool from env and confirms a successful connection', async () => {
    vi.resetModules();
    const { pool, testConnection } = await import('../../config/db.js');

    expect(createPool).toHaveBeenCalledWith(
      expect.objectContaining({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      })
    );

    await expect(testConnection()).resolves.toBeUndefined();
    expect(pool.getConnection).toBe(getConnection);
    expect(release).toHaveBeenCalledOnce();
  });

  it('rethrows connection failures', async () => {
    vi.resetModules();
    const err = new Error('db down');
    getConnection.mockRejectedValue(err);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { testConnection } = await import('../../config/db.js');

    await expect(testConnection()).rejects.toThrow('db down');
    expect(errorSpy).toHaveBeenCalledWith('Database connection failed', 'db down');

    errorSpy.mockRestore();
  });
});
