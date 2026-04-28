import { z } from 'zod';
import type { transactions } from '../../db/schema/index.js';

export type TransactionRow = typeof transactions.$inferSelect;

const transactionResponseSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.enum(['GBP']),
  type: z.enum(['deposit', 'withdrawal']),
  reference: z.string().nullable().optional(),
  userId: z.string(),
  createdTimestamp: z.string(),
});

const accountIdParams = z.object({
  accountId: z.uuid(),
});

const transactionIdParams = accountIdParams.extend({
  transactionId: z.string().regex(/^tan-[A-Za-z0-9_-]+$/),
});

// Strict request validators
const createTransactionBody = z.object({
  amount: z.number().positive().max(10000),
  currency: z.enum(['GBP']),
  type: z.enum(['deposit', 'withdrawal']),
  reference: z.string().max(255).optional(),
});

export const createTransactionSchema = {
  params: accountIdParams,
  body: createTransactionBody,
  response: { 201: transactionResponseSchema },
};

export const listTransactionsSchema = {
  params: accountIdParams,
  response: { 200: z.object({ transactions: z.array(transactionResponseSchema) }) },
};

export const getTransactionSchema = {
  params: transactionIdParams,
  response: { 200: transactionResponseSchema },
};

export type Transaction = z.infer<typeof transactionResponseSchema>;
export type CreateTransactionBody = z.infer<typeof createTransactionBody>;
export type AccountIdParams = z.infer<typeof accountIdParams>;
export type TransactionIdParams = z.infer<typeof transactionIdParams>;
