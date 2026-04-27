import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createDb } from "../../src/db/index.js";
import { users } from "../../src/db/schema/index.js";
import { seedDb, truncateAll } from "../../src/db/util.js";
import { testConfig } from "./config.js";

export const testDb = createDb(testConfig.databaseUrl);

export async function seedAll() {
  await truncateAll(testDb);
  return seedDb(testDb);
}

export async function seedDeletedUser() {
  const userId = `usr-${nanoid()}`;

  await testDb.insert(users).values({
    id: userId,
    name: "Deleted User",
    email: "deleted@example.com",
    passwordHash: await bcrypt.hash("password123", 10),
    phoneNumber: "+447700900002",
    address: {
      line1: "2 Test Street",
      town: "London",
      county: "Greater London",
      postcode: "EC1A 1BC"
    },
    deletedAt: new Date()
  });

  return { userId };
}
