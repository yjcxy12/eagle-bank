import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/app.js';
import { truncateAll } from '../helpers/db.js';

const app = buildTestApp();

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await truncateAll();
});

const user = {
  name: 'Auth User',
  email: 'authuser@example.com',
  password: 'password123',
  phoneNumber: '+447911000001',
  address: {
    line1: '1 Test St',
    town: 'London',
    county: 'Greater London',
    postcode: 'EC1A 1BB',
  },
};

async function createUser(u = user) {
  await app.inject({ method: 'POST', url: '/v1/users', payload: u });
}

describe('POST /v1/auth/login', () => {
  it('returns 200 and a token with valid credentials', async () => {
    await createUser();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: user.email, password: user.password },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty('token');
    expect(typeof res.json().token).toBe('string');
  });

  it('returns 401 with wrong password', async () => {
    await createUser();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: user.email, password: 'wrongpassword' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe('Invalid credentials');
  });

  it('returns 401 when email does not exist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'nobody@example.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe('Invalid credentials');
  });

  it('returns 401 for a soft-deleted user', async () => {
    await createUser();
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: user.email, password: user.password },
    });
    const { token } = loginRes.json();
    const userId = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    ).userId as string;

    await app.inject({
      method: 'DELETE',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: user.email, password: user.password },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe('Invalid credentials');
  });

  it('returns 400 when email is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { password: 'password123' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      message: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
        }),
      ]),
    });
  });

  it('returns 400 when password is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'test@example.com' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      message: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({
          field: 'password',
        }),
      ]),
    });
  });

  it('returns 400 with invalid email format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'not-an-email', password: 'password123' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      message: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
        }),
      ]),
    });
  });
});
