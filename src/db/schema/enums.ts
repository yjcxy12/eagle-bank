import { pgEnum } from 'drizzle-orm/pg-core';

export const accountTypeEnum = pgEnum('account_type', ['personal']);
export const currencyEnum = pgEnum('currency', ['GBP']);
export const transactionTypeEnum = pgEnum('transaction_type', [
  'deposit',
  'withdrawal',
]);
