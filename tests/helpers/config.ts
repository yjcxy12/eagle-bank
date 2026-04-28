import 'dotenv/config';

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

export const testConfig = {
  databaseUrl: required("TEST_DATABASE_URL"),
};
