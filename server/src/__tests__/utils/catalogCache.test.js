import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCatalogCache, withCatalogCache } from '../../utils/catalogCache.js';

describe('catalog cache', () => {
  beforeEach(() => {
    clearCatalogCache();
  });

  it('reuses a warm value', async () => {
    const load = vi.fn().mockResolvedValue({ products: [1] });

    const first = await withCatalogCache('products', load);
    const second = await withCatalogCache('products', load);

    expect(second).toBe(first);
    expect(load).toHaveBeenCalledOnce();
  });

  it('shares an in-flight load', async () => {
    const load = vi.fn().mockResolvedValue({ products: [1] });

    const [first, second] = await Promise.all([
      withCatalogCache('products', load),
      withCatalogCache('products', load),
    ]);

    expect(second).toBe(first);
    expect(load).toHaveBeenCalledOnce();
  });

  it('does not retain failed loads', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('Database unavailable'))
      .mockResolvedValueOnce({ products: [1] });

    await expect(withCatalogCache('products', load)).rejects.toThrow('Database unavailable');
    await expect(withCatalogCache('products', load)).resolves.toEqual({ products: [1] });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not repopulate an invalidated in-flight value', async () => {
    let finishLoad;
    const pendingValue = new Promise((resolve) => {
      finishLoad = resolve;
    });
    const staleLoad = vi.fn(() => pendingValue);

    const pending = withCatalogCache('products', staleLoad);
    await Promise.resolve();
    clearCatalogCache();
    finishLoad({ products: ['stale'] });
    await pending;

    const freshLoad = vi.fn().mockResolvedValue({ products: ['fresh'] });
    await expect(withCatalogCache('products', freshLoad)).resolves.toEqual({
      products: ['fresh'],
    });
    expect(freshLoad).toHaveBeenCalledOnce();
  });
});
