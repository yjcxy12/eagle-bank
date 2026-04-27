import { pgEnum } from 'drizzle-orm/pg-core';

export const accountTypeEnum = pgEnum('account_type', ['personal']);
export const sortCodeEnum = pgEnum('sort_code', ['10-10-10']);
export const currencyEnum = pgEnum('currency', ['GBP']);
export const transactionTypeEnum = pgEnum('transaction_type', [
  'deposit',
  'withdrawal',
]);
