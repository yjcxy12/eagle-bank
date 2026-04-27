import { relations } from 'drizzle-orm';
import {
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { accountTypeEnum, currencyEnum } from './enums.js';
import { transactions } from './transactions.js';
import { users } from './users.js';

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountNumber: varchar('account_number', { length: 8 }).unique().notNull(), // 01XXXXXX
    sortCode: varchar('sort_code', { length: 8 }).notNull(), // e.g. 10-10-10
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
