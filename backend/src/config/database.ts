import fs from 'node:fs/promises'
import pg from 'pg'
import env from './env.js'

// Callers pass the row shape they expect, e.g. query<ProductRow>(...).
export type QueryResult<T = Record<string, unknown>> = {
  rows: T[]
  rowCount: number
}

export type QueryFn = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>

// One shared pool per process: it reuses TCP connections instead of opening one per query.
let pool: pg.Pool | null = null

const getPool = () => {
  pool ??= new pg.Pool({ connectionString: env.DATABASE_URL })
  return pool
}

const toQueryResult = <T>(result: pg.QueryResult): QueryResult<T> => ({
  rows: result.rows,
  rowCount: result.rowCount ?? result.rows.length,
})

export const query: QueryFn = async <T>(sql: string, params: unknown[] = []) =>
  toQueryResult<T>(await getPool().query(sql, params))

// Runs `work` on a single connection inside BEGIN/COMMIT, rolling back if it throws.
// A transaction must stay on one connection, which is why it can't use the shared `query`.
export const transaction = async <T>(work: (query: QueryFn) => Promise<T>): Promise<T> => {
  const client = await getPool().connect()

  try {
    await client.query('BEGIN')
    const result = await work(async <R>(sql: string, params: unknown[] = []) =>
      toQueryResult<R>(await client.query(sql, params)),
    )
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const isDatabaseAvailable = async (): Promise<boolean> => {
  try {
    await query('SELECT 1')
    return true
  } catch {
    return false
  }
}

// Resolves to backend/db from both src/config (tsx) and dist/config (compiled build).
const sqlFile = (name: string) => new URL(`../../db/${name}`, import.meta.url)

// Creates tables and demo data. Both files are idempotent, so this is safe on every startup.
export const initializeDatabase = async () => {
  // Multi-statement files go straight to the pool: pg returns one result per statement.
  await getPool().query(await fs.readFile(sqlFile('schema.sql'), 'utf8'))
  await getPool().query(await fs.readFile(sqlFile('seed.sql'), 'utf8'))
}

export const closeDatabasePool = async () => {
  if (pool) {
    await pool.end()
    pool = null
  }
}
