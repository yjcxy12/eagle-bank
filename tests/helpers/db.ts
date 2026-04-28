import { createDb } from '../../src/db/index.js';
import { truncateAll as truncateAllDb } from '../../src/db/util.js';
import { testConfig } from './config.js';

export const testDb = createDb(testConfig.databaseUrl);

export async function truncateAll() {
  await truncateAllDb(testDb);
}
