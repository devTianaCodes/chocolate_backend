import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../app.js';

describe('app integration routes', () => {
  it('serves the health endpoint through the express app', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.timestamp).toEqual(expect.any(String));
  });

  it('rejects invalid registration payloads before any service work', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: '',
        lastName: '',
        email: 'invalid-email',
        password: 'short',
        shippingAddress: {},
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'First name required',
    });
  });

  it('rejects login requests with missing credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Email and password required',
    });
  });

  it('rejects protected order routes without a bearer token', async () => {
    const response = await request(app).get('/api/orders');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('rejects protected payment intent routes without a bearer token', async () => {
    const response = await request(app)
      .post('/api/payments/stripe/intent')
      .send({ orderId: 42 });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('returns the shared not-found payload for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: 'Not found',
    });
  });
});
