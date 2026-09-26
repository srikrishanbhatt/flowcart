import { initializeDatabase, getDatabasePool } from './src/config/database.ts'

try {
  await initializeDatabase()
  const db = getDatabasePool()
  console.log('db exists?', !!db)
  console.log(JSON.stringify(db.query('SELECT 1 AS ok')))
  console.log(JSON.stringify(db.query('SELECT COUNT(*) AS count FROM products')))
} catch (error) {
  console.error('ERROR', error)
  process.exit(1)
}
