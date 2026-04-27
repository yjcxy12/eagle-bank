import { relations } from 'drizzle-orm';
import { jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';

export type Address = {
  line1: string;
  line2?: string;
  line3?: string;
  town: string;
  county: string;
  postcode: string;
};

export const users = pgTable('users', {
  id: varchar('id').primaryKey(), // usr-{nanoid}
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 254 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 72 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  address: jsonb('address').$type<Address>().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));
