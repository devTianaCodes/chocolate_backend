import { describe, expect, it } from 'vitest';
import { createMockResponse } from '../setup/mockHttp.js';
import { errorHandler } from '../../middleware/errorHandler.js';

describe('errorHandler middleware', () => {
  it('returns the explicit status and message for handled errors', () => {
    const res = createMockResponse();

    errorHandler({ status: 422, message: 'Invalid payload' }, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.body).toEqual({ success: false, error: 'Invalid payload' });
  });

  it('returns a generic message for server errors', () => {
    const res = createMockResponse();

    errorHandler(new Error('secret internal detail'), {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ success: false, error: 'Server error' });
  });
});
