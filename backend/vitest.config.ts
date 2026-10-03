import { defineConfig } from 'vitest/config'
import { resolveTestDatabaseUrl } from './tests/test-database.js'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: resolveTestDatabaseUrl(),
      // Test-only value so the suite runs without a local .env (e.g. in CI).
      JWT_SECRET: 'test-only-jwt-secret-not-used-anywhere-else',
    },
  },
})
