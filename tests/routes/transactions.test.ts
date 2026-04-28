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

// POST /v1/accounts/:accountId/transactions

describe('POST /v1/accounts/:accountId/transactions', () => {
  it('returns 201 for a deposit', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 100, currency: 'GBP', type: 'deposit' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({ amount: 100, currency: 'GBP', type: 'deposit' });
    expect(body).toHaveProperty('id');
    expect(body.id).toMatch(/^tan-/);
    expect(body).toHaveProperty('createdTimestamp');
  });

  it('returns 201 for a withdrawal and updates balance', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 500, currency: 'GBP', type: 'deposit' },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 200, currency: 'GBP', type: 'withdrawal' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ amount: 200, type: 'withdrawal' });

    const accRes = await app.inject({ method: 'GET', url: `/v1/accounts/${accountId}`, headers: { Authorization: `Bearer ${token}` } });
    expect(accRes.json().balance).toBe(300);
  });

  it('returns 201 with optional reference', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 50, currency: 'GBP', type: 'deposit', reference: 'Monthly salary' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().reference).toBe('Monthly salary');
  });

  it('returns 422 when insufficient funds for withdrawal', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 100, currency: 'GBP', type: 'withdrawal' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().message).toBe('Insufficient funds');
  });

  it('returns 422 when deposit would exceed maximum balance', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 9000, currency: 'GBP', type: 'deposit' },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 2000, currency: 'GBP', type: 'deposit' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().message).toBe('Balance would exceed maximum');
  });

  it('returns 401 when no token is provided', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      payload: { amount: 100, currency: 'GBP', type: 'deposit' },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 when transacting on another user's account", async () => {
    const { token: token1 } = await createAndLogin(user1);
    const { token: token2 } = await createAndLogin(user2);
    const user2AccountId = await createAccount(token2);

    const res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${user2AccountId}/transactions`,
      headers: { Authorization: `Bearer ${token1}` },
      payload: { amount: 100, currency: 'GBP', type: 'deposit' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 404 for a non-existent account', async () => {
    const { token } = await createAndLogin();
    const res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/00000000-0000-0000-0000-000000000000/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 100, currency: 'GBP', type: 'deposit' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when amount exceeds max', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 99999, currency: 'GBP', type: 'deposit' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when amount is zero', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 0, currency: 'GBP', type: 'deposit' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when amount is negative', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: -50, currency: 'GBP', type: 'deposit' },
    });
    expect(res.statusCode).toBe(400);
  });
});

// GET /v1/accounts/:accountId/transactions

describe('GET /v1/accounts/:accountId/transactions', () => {
  it('returns 200 and lists transactions', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 100, currency: 'GBP', type: 'deposit' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const { transactions } = res.json();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toHaveProperty('id');
    expect(transactions[0]).toHaveProperty('amount');
    expect(transactions[0]).toHaveProperty('type');
  });

  it('returns transactions sorted by date descending', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 100, currency: 'GBP', type: 'deposit' },
    });
    await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 200, currency: 'GBP', type: 'deposit' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const { transactions } = res.json();
    expect(transactions).toHaveLength(2);
    const dates = transactions.map((t: any) => new Date(t.createdTimestamp).getTime());
    expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
  });

  it('returns 200 with empty list for account with no transactions', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().transactions).toHaveLength(0);
  });

  it('returns 401 when no token is provided', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({ method: 'GET', url: `/v1/accounts/${accountId}/transactions` });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 when listing another user's transactions", async () => {
    const { token: token1 } = await createAndLogin(user1);
    const { token: token2 } = await createAndLogin(user2);
    const user2AccountId = await createAccount(token2);

    const res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${user2AccountId}/transactions`,
      headers: { Authorization: `Bearer ${token1}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 404 for a non-existent account', async () => {
    const { token } = await createAndLogin();
    const res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/00000000-0000-0000-0000-000000000000/transactions`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

// GET /v1/accounts/:accountId/transactions/:transactionId

describe('GET /v1/accounts/:accountId/transactions/:transactionId', () => {
  it('returns 200 and the transaction', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 75, currency: 'GBP', type: 'deposit', reference: 'Test ref' },
    });
    const transactionId = createRes.json().id;

    const res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${accountId}/transactions/${transactionId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: transactionId, amount: 75, type: 'deposit', reference: 'Test ref' });
  });

  it('returns 401 when no token is provided', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${accountId}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 50, currency: 'GBP', type: 'deposit' },
    });
    const transactionId = createRes.json().id;

    const res = await app.inject({ method: 'GET', url: `/v1/accounts/${accountId}/transactions/${transactionId}` });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 when accessing another user's transaction", async () => {
    const { token: token1 } = await createAndLogin(user1);
    const { token: token2 } = await createAndLogin(user2);
    const user2AccountId = await createAccount(token2);

    await app.inject({
      method: 'POST',
      url: `/v1/accounts/${user2AccountId}/transactions`,
      headers: { Authorization: `Bearer ${token2}` },
      payload: { amount: 100, currency: 'GBP', type: 'deposit' },
    });
    const txRes = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${user2AccountId}/transactions`,
      headers: { Authorization: `Bearer ${token2}` },
    });
    const transactionId = txRes.json().transactions[0].id;

    const res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${user2AccountId}/transactions/${transactionId}`,
      headers: { Authorization: `Bearer ${token1}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 404 for a non-existent transaction', async () => {
    const { token } = await createAndLogin();
    const accountId = await createAccount(token);

    const res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${accountId}/transactions/tan-doesnotexist`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when transactionId belongs to a different account', async () => {
    const { token } = await createAndLogin();
    const acc1Id = await createAccount(token, 'Account 1');
    const acc2Id = await createAccount(token, 'Account 2');

    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${acc1Id}/transactions`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 100, currency: 'GBP', type: 'deposit' },
    });
    const acc1TransactionId = createRes.json().id;

    const res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${acc2Id}/transactions/${acc1TransactionId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
