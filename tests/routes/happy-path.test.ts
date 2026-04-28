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
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'password123',
  phoneNumber: '+447911123456',
  address: {
    line1: '1 Bank Street',
    town: 'London',
    county: 'Greater London',
    postcode: 'EC1A 1BB',
  },
};

describe('happy path — full lifecycle', () => {
  it('creates user, manages accounts and transactions, then cleans up', async () => {
    // 1. Create user
    const createUserRes = await app.inject({
      method: 'POST',
      url: '/v1/users',
      payload: user,
    });
    expect(createUserRes.statusCode).toBe(201);
    const { id: userId } = createUserRes.json();

    // 2. Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: user.email, password: user.password },
    });
    expect(loginRes.statusCode).toBe(200);
    const { token } = loginRes.json();
    const auth = { Authorization: `Bearer ${token}` };

    // 3. Create account 1
    const createAcc1Res = await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      headers: auth,
      payload: { name: 'Account One', accountType: 'personal' },
    });
    expect(createAcc1Res.statusCode).toBe(201);
    const { id: acc1Id } = createAcc1Res.json();

    // 4. Create account 2
    const createAcc2Res = await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      headers: auth,
      payload: { name: 'Account Two', accountType: 'personal' },
    });
    expect(createAcc2Res.statusCode).toBe(201);
    const { id: acc2Id } = createAcc2Res.json();

    // 5. Deposit 20 to account 1 → balance = 20
    const dep20Res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${acc1Id}/transactions`,
      headers: auth,
      payload: { amount: 20, currency: 'GBP', type: 'deposit' },
    });
    expect(dep20Res.statusCode).toBe(201);
    expect(dep20Res.json().amount).toBe(20);

    // 6. Withdraw 30 from account 1 → 422 insufficient funds (balance stays 20)
    const withdraw30Res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${acc1Id}/transactions`,
      headers: auth,
      payload: { amount: 30, currency: 'GBP', type: 'withdrawal' },
    });
    expect(withdraw30Res.statusCode).toBe(422);
    expect(withdraw30Res.json().message).toBe('Insufficient funds');

    // 7. Deposit 100 to account 1 → balance = 120
    const dep100Res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${acc1Id}/transactions`,
      headers: auth,
      payload: { amount: 100, currency: 'GBP', type: 'deposit' },
    });
    expect(dep100Res.statusCode).toBe(201);

    // Verify account 1 balance = 120
    const getAcc1Res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${acc1Id}`,
      headers: auth,
    });
    expect(getAcc1Res.statusCode).toBe(200);
    expect(getAcc1Res.json().balance).toBe(120);

    // 8. Deposit 500 to account 2 → balance = 500
    const dep500Res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${acc2Id}/transactions`,
      headers: auth,
      payload: { amount: 500, currency: 'GBP', type: 'deposit' },
    });
    expect(dep500Res.statusCode).toBe(201);

    // 9. Withdraw 400 from account 2 → balance = 100
    const withdraw400Res = await app.inject({
      method: 'POST',
      url: `/v1/accounts/${acc2Id}/transactions`,
      headers: auth,
      payload: { amount: 400, currency: 'GBP', type: 'withdrawal' },
    });
    expect(withdraw400Res.statusCode).toBe(201);

    // Verify account 2 balance = 100
    const getAcc2Res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${acc2Id}`,
      headers: auth,
    });
    expect(getAcc2Res.statusCode).toBe(200);
    expect(getAcc2Res.json().balance).toBe(100);

    // 10. List transactions on account 1 → 2 transactions (deposit 20, deposit 100)
    const txAcc1Res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${acc1Id}/transactions`,
      headers: auth,
    });
    expect(txAcc1Res.statusCode).toBe(200);
    const txAcc1 = txAcc1Res.json().transactions;
    expect(txAcc1).toHaveLength(2);
    expect(txAcc1.map((t: any) => t.amount).sort()).toEqual([20, 100].sort());
    expect(txAcc1.every((t: any) => t.type === 'deposit')).toBe(true);

    // 11. List transactions on account 2 → 2 transactions (deposit 500, withdrawal 400)
    const txAcc2Res = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${acc2Id}/transactions`,
      headers: auth,
    });
    expect(txAcc2Res.statusCode).toBe(200);
    const txAcc2 = txAcc2Res.json().transactions;
    expect(txAcc2).toHaveLength(2);
    expect(txAcc2.find((t: any) => t.type === 'deposit').amount).toBe(500);
    expect(txAcc2.find((t: any) => t.type === 'withdrawal').amount).toBe(400);

    // 12. Delete account 2 → 204
    const delAcc2Res = await app.inject({
      method: 'DELETE',
      url: `/v1/accounts/${acc2Id}`,
      headers: auth,
    });
    expect(delAcc2Res.statusCode).toBe(204);

    // 13. List accounts → only account 1 remains
    const listAccRes = await app.inject({
      method: 'GET',
      url: '/v1/accounts',
      headers: auth,
    });
    expect(listAccRes.statusCode).toBe(200);
    const accountList = listAccRes.json().accounts;
    expect(accountList).toHaveLength(1);
    expect(accountList[0].id).toBe(acc1Id);

    // 14. Delete user → 409 (account 1 still exists)
    const delUserEarlyRes = await app.inject({
      method: 'DELETE',
      url: `/v1/users/${userId}`,
      headers: auth,
    });
    expect(delUserEarlyRes.statusCode).toBe(409);
    expect(delUserEarlyRes.json().message).toBe('User has active accounts');

    // 15. Delete account 1 → 204
    const delAcc1Res = await app.inject({
      method: 'DELETE',
      url: `/v1/accounts/${acc1Id}`,
      headers: auth,
    });
    expect(delAcc1Res.statusCode).toBe(204);

    // 16. Delete user → 204 (no more accounts)
    const delUserRes = await app.inject({
      method: 'DELETE',
      url: `/v1/users/${userId}`,
      headers: auth,
    });
    expect(delUserRes.statusCode).toBe(204);

    // Verify user is gone
    const getUserRes = await app.inject({
      method: 'GET',
      url: `/v1/users/${userId}`,
      headers: auth,
    });
    expect(getUserRes.statusCode).toBe(404);
  });
});
