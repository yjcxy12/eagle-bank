import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/setup.ts',
    testTimeout: 10000,
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
});
