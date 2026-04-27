import "dotenv/config";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type { Db } from "./index.js";
import { accounts, transactions, users } from "./schema/index.js";

export async function truncateAll(db: Db) {
  await db.delete(transactions);
  await db.delete(accounts);
  await db.delete(users);
}

export async function seedDb(db: Db) {
  const userId1 = `usr-${nanoid()}`;
  const userId2 = `usr-${nanoid()}`;
  const accountId1 = crypto.randomUUID();
  const accountId2 = crypto.randomUUID();
  const accountId3 = crypto.randomUUID();

  await db.insert(users).values([
    {
      id: userId1,
      name: "Alice Smith",
      email: "alice@example.com",
      passwordHash: await bcrypt.hash("password123", 10),
      phoneNumber: "+447700900001",
      address: {
        line1: "1 High Street",
        town: "London",
        county: "Greater London",
        postcode: "EC1A 1BB"
      }
    },
    {
      id: userId2,
      name: "Bob Jones",
      email: "bob@example.com",
      passwordHash: await bcrypt.hash("password123", 10),
      phoneNumber: "+447700900002",
      address: {
        line1: "42 Oak Avenue",
        line2: "Flat 3",
        town: "Manchester",
        county: "Greater Manchester",
        postcode: "M1 1AE"
      }
    }
  ]);

  await db.insert(accounts).values([
    {
      id: accountId1,
      accountNumber: "01100001",
      sortCode: "10-10-10",
      userId: userId1,
      name: "Personal Account",
      balance: "1500.00"
    },
    {
      id: accountId2,
      accountNumber: "01100002",
      sortCode: "10-10-10",
      userId: userId1,
      name: "Savings Account",
      balance: "5000.00"
    },
    {
      id: accountId3,
      accountNumber: "01100003",
      sortCode: "10-10-10",
      userId: userId2,
      name: "Personal Account",
      balance: "250.00"
    }
  ]);

  await db.insert(transactions).values([
    {
      id: `tan-${nanoid()}`,
      accountId: accountId1,
      userId: userId1,
      amount: "2000.00",
      type: "deposit",
      reference: "Opening deposit"
    },
    {
      id: `tan-${nanoid()}`,
      accountId: accountId1,
      userId: userId1,
      amount: "500.00",
      type: "withdrawal",
      reference: "Rent payment"
    },
    {
      id: `tan-${nanoid()}`,
      accountId: accountId2,
      userId: userId1,
      amount: "5000.00",
      type: "deposit",
      reference: "Savings transfer"
    },
    {
      id: `tan-${nanoid()}`,
      accountId: accountId3,
      userId: userId2,
      amount: "250.00",
      type: "deposit",
      reference: "Opening deposit"
    }
  ]);

  return { aliceEmail: "alice@example.com", bobEmail: "bob@example.com" };
}
