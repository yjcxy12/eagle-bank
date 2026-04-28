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

const user1 = {
  name: 'User One',
  email: 'user1@example.com',
  password: 'password123',
  phoneNumber: '+447911000001',
  address: { line1: '1 Test St', town: 'London', county: 'Greater London', postcode: 'EC1A 1BB' },
};

const user2 = {
  name: 'User Two',
  email: 'user2@example.com',
  password: 'password123',
  phoneNumber: '+447911000002',
  address: { line1: '2 Test St', town: 'London', county: 'Greater London', postcode: 'EC1A 1BC' },
};

async function createAndLogin(user = user1) {
  const createRes = await app.inject({ method: 'POST', url: '/v1/users', payload: user });
  const { id: userId } = createRes.json();
  const loginRes = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email: user.email, password: user.password },
  });
  return { userId, token: loginRes.json().token as string };
}

async function createAccount(token: string, name = 'Test Account') {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/accounts',
    headers: { Authorization: `Bearer ${token}` },
    payload: { name, accountType: 'personal' },
  });
  return res.json().id as string;
}

// POST /v1/accounts

describe('POST /v1/accounts', () => {
  it('returns 201 and the created account', async () => {
    const { token } = await createAndLogin();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'New Account', accountType: 'personal' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({ name: 'New Account', accountType: 'personal', currency: 'GBP', balance: 0 });
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('accountNumber');
    expect(body).toHaveProperty('sortCode', '10-10-10');
    expect(body).toHaveProperty('createdTimestamp');
    expect(body).toHaveProperty('updatedTimestamp');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      payload: { name: 'New Account', accountType: 'personal' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const { token } = await createAndLogin();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      headers: { Authorization: `Bearer ${token}` },
      payload: { accountType: 'personal' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe('Validation failed');
  });

  it('returns 400 when accountType is invalid', async () => {
    const { token } = await createAndLogin();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'New Account', accountType: 'business' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe('Validation failed');
  });
});

// GET /v1/accounts

describe('GET /v1/accounts', () => {
  it('returns 200 and the list of accounts for the authenticated user', async () => {
    const { token } = await createAndLogin();
    await createAccount(token, 'Account A');
    await createAccount(token, 'Account B');

    const res = await app.inject({ method: 'GET', url: '/v1/accounts', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const { accounts } = res.json();
    expect(accounts).toHaveLength(2);
    expect(accounts.every((a: any) => a.currency === 'GBP')).toBe(true);
  });

  it('returns 200 and an empty list when user has no accounts', async () => {
    const { token } = await createAndLogin();
    const res = await app.inject({ method: 'GET', url: '/v1/accounts', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().accounts).toHaveLength(0);
  });

  it('returns only the authenticated user\'s accounts', async () => {
    const { token: token1 } = await createAndLogin(user1);
    const { token: token2 } = await createAndLogin(user2);
    await createAccount(token1, 'User1 Account');
    await createAccount(token2, 'User2 Account');

    const res = await app.inject({ method: 'GET', url: '/v1/accounts', headers: { Authorization: `Bearer ${token1}` } });
    expect(res.json().accounts).toHaveLength(1);
    expect(res.json().accounts[0].name).toBe('User1 Account');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/accounts' });
    expect(res.statusCode).toBe(401);
  });
});

// GET /v1/accounts/:accountId

describe('GET /v1/accounts/:accountId', () => {
  it('returns 200 and the account', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({ method: 'GET', url: `/v1/accounts/${accountId}`, headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(accountId);
  });

  it('returns 401 when no token is provided', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({ method: 'GET', url: `/v1/accounts/${accountId}` });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 when accessing another user's account", async () => {
    const { token: token1 } = await createAndLogin(user1);
    const { token: token2 } = await createAndLogin(user2);
    const user2AccountId = await createAccount(token2);

    const res = await app.inject({ method: 'GET', url: `/v1/accounts/${user2AccountId}`, headers: { Authorization: `Bearer ${token1}` } });
    expect(res.statusCode).toBe(403);
  });

  it('returns 404 for a non-existent account', async () => {
    const { token } = await createAndLogin();
    const res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/00000000-0000-0000-0000-000000000000`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for a soft-deleted account', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    await app.inject({ method: 'DELETE', url: `/v1/accounts/${accountId}`, headers: { Authorization: `Bearer ${token}` } });

    const res = await app.inject({ method: 'GET', url: `/v1/accounts/${accountId}`, headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(404);
  });
});

// PATCH /v1/accounts/:accountId

describe('PATCH /v1/accounts/:accountId', () => {
  it('returns 200 and the updated account', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/accounts/${accountId}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Renamed Account' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Renamed Account');
  });

  it('returns 401 when no token is provided', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({ method: 'PATCH', url: `/v1/accounts/${accountId}`, payload: { name: 'X' } });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 when patching another user's account", async () => {
    const { token: token1 } = await createAndLogin(user1);
    const { token: token2 } = await createAndLogin(user2);
    const user2AccountId = await createAccount(token2);

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/accounts/${user2AccountId}`,
      headers: { Authorization: `Bearer ${token1}` },
      payload: { name: 'Hacked' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 404 for a non-existent account', async () => {
    const { token } = await createAndLogin();
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/accounts/00000000-0000-0000-0000-000000000000`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'X' },
    });
    expect(res.statusCode).toBe(404);
  });
});

// DELETE /v1/accounts/:accountId

describe('DELETE /v1/accounts/:accountId', () => {
  it('returns 204 when account is deleted', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({ method: 'DELETE', url: `/v1/accounts/${accountId}`, headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(204);
  });

  it('returns 401 when no token is provided', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({ method: 'DELETE', url: `/v1/accounts/${accountId}` });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 when deleting another user's account", async () => {
    const { token: token1 } = await createAndLogin(user1);
    const { token: token2 } = await createAndLogin(user2);
    const user2AccountId = await createAccount(token2);

    const res = await app.inject({ method: 'DELETE', url: `/v1/accounts/${user2AccountId}`, headers: { Authorization: `Bearer ${token1}` } });
    expect(res.statusCode).toBe(403);
  });

  it('returns 404 for a non-existent account', async () => {
    const { token } = await createAndLogin();
    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/accounts/00000000-0000-0000-0000-000000000000`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('deleted account no longer appears in list', async () => {
    const { token } = await createAndLogin();
    const acc1Id = await createAccount(token, 'Account A');
    const acc2Id = await createAccount(token, 'Account B');

    await app.inject({ method: 'DELETE', url: `/v1/accounts/${acc1Id}`, headers: { Authorization: `Bearer ${token}` } });

    const listRes = await app.inject({ method: 'GET', url: '/v1/accounts', headers: { Authorization: `Bearer ${token}` } });
    expect(listRes.json().accounts).toHaveLength(1);
    expect(listRes.json().accounts[0].id).toBe(acc2Id);
  });
});
