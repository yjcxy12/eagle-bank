import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../../db/index.js';
import { accounts } from '../../db/schema/index.js';
import type { AccountRow, CreateAccountBody, UpdateAccountBody } from './types.js';

async function nextAccountNumber(db: Db): Promise<string> {
  const [{ nextval }] = await db.execute<{ nextval: string }>(
    sql`SELECT nextval('account_number_seq')`,
  );
  return `01${nextval.padStart(6, '0')}`;
}

export async function createAccount({
  db,
  userId,
  data,
}: {
  db: Db;
  userId: string;
  data: CreateAccountBody;
}): Promise<AccountRow> {
  const accountNumber = await nextAccountNumber(db);
  const [account] = await db
    .insert(accounts)
    .values({ accountNumber, userId, ...data })
    .returning();
  return account;
}

export async function listAccounts({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<AccountRow[]> {
  return db.query.accounts.findMany({
    where: and(eq(accounts.userId, userId), isNull(accounts.deletedAt)),
  });
}

export async function findAccountById({
  db,
  accountId,
}: {
  db: Db;
  accountId: string;
}): Promise<AccountRow | null> {
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  });
  if (!account || account.deletedAt) return null;
  return account;
}

export async function updateAccount({
  db,
  accountId,
  userId,
  data,
}: {
  db: Db;
  accountId: string;
  userId: string;
  data: UpdateAccountBody;
}): Promise<{ error: 'not_found' | 'forbidden' } | { account: AccountRow }> {
  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  });
  if (!existing || existing.deletedAt) return { error: 'not_found' };
  if (existing.userId !== userId) return { error: 'forbidden' };

  const [account] = await db
    .update(accounts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(accounts.id, accountId))
    .returning();
  return { account };
}

export async function deleteAccount({
  db,
  accountId,
  userId,
}: {
  db: Db;
  accountId: string;
  userId: string;
}): Promise<{ error: 'not_found' | 'forbidden' } | { success: true }> {
  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  });
  if (!existing || existing.deletedAt) return { error: 'not_found' };
  if (existing.userId !== userId) return { error: 'forbidden' };

  await db
    .update(accounts)
    .set({ deletedAt: new Date() })
    .where(eq(accounts.id, accountId));
  return { success: true };
}
