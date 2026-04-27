import { relations } from 'drizzle-orm';
import {
  index,
  numeric,
  pgSequence,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { accountTypeEnum, currencyEnum, sortCodeEnum } from './enums.js';

export const accountNumberSeq = pgSequence('account_number_seq', {
  startWith: 1,
  maxValue: 999999,
  cycle: false,
});

import { transactions } from './transactions.js';
import { users } from './users.js';

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountNumber: varchar('account_number', { length: 8 }).unique().notNull(), // 01XXXXXX
    sortCode: sortCodeEnum('sort_code').notNull().default('10-10-10'),
    userId: varchar('user_id')
      .notNull()
      .references(() => users.id),
    name: varchar('name', { length: 255 }).notNull(),
    accountType: accountTypeEnum('account_type').notNull().default('personal'),
    balance: numeric('balance', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    currency: currencyEnum('currency').notNull().default('GBP'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)],
);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactions: many(transactions),
}));
