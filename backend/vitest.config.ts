import { defineConfig } from 'vitest/config'
import { resolveTestDatabaseUrl } from './tests/test-database.js'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: resolveTestDatabaseUrl(),
    },
  },
})
