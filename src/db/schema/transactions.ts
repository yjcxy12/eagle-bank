import { relations } from 'drizzle-orm';
import {
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { currencyEnum, transactionTypeEnum } from './enums.js';
import { users } from './users.js';

export const transactions = pgTable(
  'transactions',
  {
    id: varchar('id').primaryKey(), // tan-{nanoid}
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    userId: varchar('user_id')
      .notNull()
      .references(() => users.id),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: currencyEnum('currency').notNull().default('GBP'),
    type: transactionTypeEnum('type').notNull(),
    reference: varchar('reference', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('transactions_account_id_idx').on(table.accountId),
    index('transactions_user_id_idx').on(table.userId),
  ],
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));
