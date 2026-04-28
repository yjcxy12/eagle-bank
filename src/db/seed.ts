import 'dotenv/config';
import { createDb } from './index.js';
import { seedDb, truncateAll } from './util.js';

// CLI entrypoint
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL env var is mising');
}
const db = createDb(databaseUrl);

async function run() {
  console.log('Seeding database...');
  await truncateAll(db);
  await seedDb(db);
  console.log('Seed complete.');
  console.log('  Users:    alice@example.com / bob@example.com');
  console.log('  Password: password123');
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
