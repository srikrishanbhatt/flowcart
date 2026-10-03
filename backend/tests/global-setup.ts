import { fileURLToPath } from 'node:url'
import { runner } from 'node-pg-migrate'
import pg from 'pg'
import { seedDatabase } from '../scripts/seed.js'
import { resolveTestDatabaseUrl } from './test-database.js'

// Runs once before all test files: ensures the test database exists, wipes it,
// then applies migrations and seed data so every run starts from the same state.
export default async function setup() {
  const testUrl = new URL(resolveTestDatabaseUrl())
  const databaseName = testUrl.pathname.slice(1)

  if (!/^[a-z0-9_]+$/i.test(databaseName) || !databaseName.includes('test')) {
    throw new Error(`Refusing to reset "${databaseName}": test database name must contain "test"`)
  }

  const adminUrl = new URL(testUrl)
  adminUrl.pathname = '/postgres'
  const admin = new pg.Client({ connectionString: adminUrl.toString() })
  await admin.connect()

  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName])

    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${databaseName}"`)
    }
  } finally {
    await admin.end()
  }

  const client = new pg.Client({ connectionString: testUrl.toString() })
  await client.connect()

  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  } finally {
    await client.end()
  }

  // Same path as a real deployment: apply every migration, then add demo data.
  await runner({
    databaseUrl: testUrl.toString(),
    dir: fileURLToPath(new URL('../db/migrations', import.meta.url)),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: () => {},
  })
  await seedDatabase(testUrl.toString())
}
