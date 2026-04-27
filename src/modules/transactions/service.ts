import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Db } from '../../db/index.js';
import { accounts, transactions } from '../../db/schema/index.js';
import type { CreateTransactionBody, TransactionRow } from './types.js';

const MAX_BALANCE = 10_000;

type CreateTransactionResult =
  | { error: 'account_not_found' | 'forbidden' | 'insufficient_funds' | 'balance_exceeded' }
  | { transaction: TransactionRow };

type GetTransactionResult =
  | { error: 'account_not_found' | 'forbidden' | 'transaction_not_found' }
  | { transaction: TransactionRow };

export async function createTransaction({
  db,
  accountId,
  userId,
  data,
}: {
  db: Db;
  accountId: string;
  userId: string;
  data: CreateTransactionBody;
}): Promise<CreateTransactionResult> {
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  });

  if (!account || account.deletedAt) return { error: 'account_not_found' };
  if (account.userId !== userId) return { error: 'forbidden' };

  const id = `tan-${nanoid()}`;
  const balanceDelta = data.type === 'deposit' ? data.amount : -data.amount;

  const result = await db.transaction(async (tx) => {
    // Lock the account row to prevent concurrent balance mutations
    const [locked] = await tx.execute<{ balance: string }>(
      sql`SELECT balance FROM accounts WHERE id = ${accountId} FOR UPDATE`,
    );
    const balance = parseFloat(locked.balance);

    if (data.type === 'withdrawal' && balance < data.amount) {
      return { error: 'insufficient_funds' as const };
    }

    if (data.type === 'deposit' && balance + data.amount > MAX_BALANCE) {
      return { error: 'balance_exceeded' as const };
    }

    const [created] = await tx
      .insert(transactions)
      .values({
        id,
        accountId,
        userId,
        amount: String(data.amount),
        currency: data.currency,
        type: data.type,
        reference: data.reference,
      })
      .returning();

    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${balanceDelta}`, updatedAt: new Date() })
      .where(eq(accounts.id, accountId));

    return { transaction: created };
  });

  return result;
}

export async function listTransactions({
  db,
  accountId,
  userId,
}: {
  db: Db;
  accountId: string;
  userId: string;
}): Promise<{ error: 'account_not_found' | 'forbidden' } | { transactions: TransactionRow[] }> {
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  });

  if (!account || account.deletedAt) return { error: 'account_not_found' };
  if (account.userId !== userId) return { error: 'forbidden' };

  const rows = await db.query.transactions.findMany({
    where: eq(transactions.accountId, accountId),
    orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
  });

  return { transactions: rows };
}

export async function findTransactionById({
  db,
  accountId,
  transactionId,
  userId,
}: {
  db: Db;
  accountId: string;
  transactionId: string;
  userId: string;
}): Promise<GetTransactionResult> {
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  });

  if (!account || account.deletedAt) return { error: 'account_not_found' };
  if (account.userId !== userId) return { error: 'forbidden' };

  const transaction = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
  });

  if (!transaction || transaction.accountId !== accountId) {
    return { error: 'transaction_not_found' };
  }

  return { transaction };
}
