import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import pg from 'pg'

// Demo data for development and tests only. Never run against production.
// Schema changes belong in db/migrations, not here.
export const seedDatabase = async (databaseUrl: string) => {
  const sql = await fs.readFile(new URL('../db/seed.sql', import.meta.url), 'utf8')
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    await client.query(sql)
  } finally {
    await client.end()
  }
}

// Run directly via `npm run seed`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { default: env } = await import('../src/config/env.js')

  if (env.NODE_ENV === 'production') {
    console.error('Refusing to seed demo data in production')
    process.exit(1)
  }

  await seedDatabase(env.DATABASE_URL)
  console.log('Seed data inserted')
}
