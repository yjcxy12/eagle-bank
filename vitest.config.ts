import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/setup.ts',
    testTimeout: 10000,
    fileParallelism: false,
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
});
