import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateOrderNumber } from '../../utils/orderNumber.js';

describe('generateOrderNumber', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the expected CH-prefixed format', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456);

    expect(generateOrderNumber()).toMatch(/^CH-[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it('changes when timestamp or random source changes', () => {
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1700000000000)
      .mockReturnValueOnce(1700000001000);
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.123456)
      .mockReturnValueOnce(0.654321);

    const first = generateOrderNumber();
    const second = generateOrderNumber();

    expect(first).not.toBe(second);
  });
});
