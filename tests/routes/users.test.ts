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

const newUser = {
  name: 'Test User',
  email: 'testuser@example.com',
  password: 'password123',
  phoneNumber: '+447911123456',
  address: {
    line1: '1 Test St',
    town: 'London',
    county: 'Greater London',
    postcode: 'EC1A 1BB',
  },
};

const otherUser = {
  name: 'Other User',
  email: 'otheruser@example.com',
  password: 'password123',
  phoneNumber: '+447911654321',
  address: {
    line1: '2 Other St',
    town: 'London',
    county: 'Greater London',
    postcode: 'EC1A 1BC',
  },
};

async function createAndLogin(user = newUser) {
  const createRes = await app.inject({
    method: 'POST',
    url: '/v1/users',
    payload: user,
  });
  const { id: userId } = createRes.json();
  const loginRes = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email: user.email, password: user.password },
  });
  return { userId, token: loginRes.json().token as string };
}

// POST /v1/users

describe('POST /v1/users', () => {
  it('returns 201 and the created user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/users',
      payload: newUser,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({
      name: newUser.name,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
    });
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('createdTimestamp');
    expect(body).not.toHaveProperty('passwordHash');
  });

  it('returns 400 when email is already in use', async () => {
    await app.inject({ method: 'POST', url: '/v1/users', payload: newUser });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/users',
      payload: newUser,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe('Email already in use');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/users',
      payload: { ...newUser, email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      message: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({
          schemaPath: expect.stringContaining('email'),
        }),
      ]),
    });
  });

  it('returns 400 when password is too short', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/users',
      payload: { ...newUser, password: 'short' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      message: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({
          schemaPath: expect.stringContaining('password'),
        }),
      ]),
    });
  });

  it('returns 400 when phone number format is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/users',
      payload: { ...newUser, phoneNumber: '07911123456' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      message: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({
          schemaPath: expect.stringContaining('phoneNumber'),
        }),
      ]),
    });
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/users',
      payload: { email: 'test@example.com' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe('Validation failed');
  });
});

// GET /v1/users/:userId

describe('GET /v1/users/:userId', () => {
  it('returns 200 and the user', async () => {
    const { userId, token } = await createAndLogin();
    const res = await app.inject({
      method: 'GET',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: userId,
      email: newUser.email,
      name: newUser.name,
    });
  });

  it('returns 401 when no token is provided', async () => {
    const { userId } = await createAndLogin();
    const res = await app.inject({ method: 'GET', url: `/v1/users/${userId}` });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when accessing another user', async () => {
    const { userId } = await createAndLogin();
    const { token: otherToken } = await createAndLogin(otherUser);
    const res = await app.inject({
      method: 'GET',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 404 for a soft-deleted user', async () => {
    const { userId, token } = await createAndLogin();
    await app.inject({
      method: 'DELETE',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await app.inject({
      method: 'GET',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

// PATCH /v1/users/:userId

describe('PATCH /v1/users/:userId', () => {
  it('returns 200 and the updated user', async () => {
    const { userId, token } = await createAndLogin();
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Updated Name' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Updated Name');
  });

  it('returns 200 when updating only some fields', async () => {
    const { userId, token } = await createAndLogin();
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { phoneNumber: '+447700000001' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().phoneNumber).toBe('+447700000001');
    expect(res.json().name).toBe(newUser.name);
  });

  it('returns 401 when no token provided', async () => {
    const { userId } = await createAndLogin();
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/users/${userId}`,
      payload: { name: 'X' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when patching another user', async () => {
    const { userId } = await createAndLogin();
    const { token: otherToken } = await createAndLogin(otherUser);
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${otherToken}` },
      payload: { name: 'X' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 400 when new email is already taken', async () => {
    const { userId, token } = await createAndLogin();
    await createAndLogin(otherUser);
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { email: otherUser.email },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe('Email already in use');
  });

  it('returns 200 when updating to the same email', async () => {
    const { userId, token } = await createAndLogin();
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { email: newUser.email },
    });
    expect(res.statusCode).toBe(200);
  });
});

// DELETE /v1/users/:userId

describe('DELETE /v1/users/:userId', () => {
  it('returns 204 when user has no accounts', async () => {
    const { userId, token } = await createAndLogin();
    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it('returns 401 when no token provided', async () => {
    const { userId } = await createAndLogin();
    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/users/${userId}`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when deleting another user', async () => {
    const { userId } = await createAndLogin();
    const { token: otherToken } = await createAndLogin(otherUser);
    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 409 when user has active accounts', async () => {
    const { userId, token } = await createAndLogin();
    await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'My Account', accountType: 'personal' },
    });
    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/users/${userId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toBe('User has active accounts');
  });
});
