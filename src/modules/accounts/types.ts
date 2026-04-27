import { z } from 'zod';
import type { accounts } from '../../db/schema/index.js';

export type AccountRow = typeof accounts.$inferSelect;

const accountResponseSchema = z.object({
  id: z.string(),
  accountNumber: z.string(),
  sortCode: z.enum(['10-10-10']),
  name: z.string(),
  accountType: z.enum(['personal']),
  balance: z.number(),
  currency: z.enum(['GBP']),
  createdTimestamp: z.string(),
  updatedTimestamp: z.string(),
});

// Strict field validators shared by create and update
const accountRequestBodySchema = z.object({
  name: z.string().max(255),
  accountType: z.enum(['personal']),
});

const accountRequestParamsSchema = z.object({
  accountId: z.uuid(),
});

export const createAccountSchema = {
  body: accountRequestBodySchema,
  response: { 201: accountResponseSchema },
};

export const listAccountsSchema = {
  response: { 200: z.object({ accounts: z.array(accountResponseSchema) }) },
};

export const getAccountSchema = {
  params: accountRequestParamsSchema,
  response: { 200: accountResponseSchema },
};

export const updateAccountSchema = {
  params: accountRequestParamsSchema,
  body: accountRequestBodySchema.partial(),
  response: { 200: accountResponseSchema },
};

export const deleteAccountSchema = {
  params: accountRequestParamsSchema,
};

export type Account = z.infer<typeof accountResponseSchema>;
export type CreateAccountBody = z.infer<typeof createAccountSchema.body>;
export type UpdateAccountBody = z.infer<typeof updateAccountSchema.body>;
export type AccountRequestParams = z.infer<typeof accountRequestParamsSchema>;
