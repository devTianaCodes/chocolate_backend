import { describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../setup/mockHttp.js';
import { validate } from '../../middleware/validate.js';

function createValidation({ error = null } = {}) {
  return {
    run: vi.fn().mockResolvedValue(undefined),
    formatter: vi.fn(() => error),
  };
}

describe('validate middleware', () => {
  it('returns a validation error when any validation formatter returns an error', async () => {
    const validations = [
      createValidation(),
      createValidation({ error: 'Email required' }),
    ];
    const middleware = validate(validations);
    const req = {};
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(validations[0].run).toHaveBeenCalledWith(req);
    expect(validations[1].run).toHaveBeenCalledWith(req);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ success: false, error: 'Validation error' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when validations pass', async () => {
    const validations = [createValidation(), createValidation()];
    const middleware = validate(validations);
    const res = createMockResponse();
    const next = vi.fn();

    await middleware({}, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
