import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { testConfig } from "./helpers/config.js";

dotenv.config();

export async function setup() {
  const client = postgres(testConfig.databaseUrl, { max: 1 });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle" });

  await client.end();
  return db;
}
