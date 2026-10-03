import { fileURLToPath } from 'node:url'
import { runner } from 'node-pg-migrate'
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

// Startup guard: running new code against an older schema fails in confusing ways
// at request time, so refuse to start until `npm run migrate` has been run.
export const findPendingMigrations = async (): Promise<string[]> => {
  const pending = await runner({
    databaseUrl: env.DATABASE_URL,
    dir: fileURLToPath(new URL('../../db/migrations', import.meta.url)),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    dryRun: true,
    log: () => {},
  })

  return pending.map((migration) => migration.name)
}

export const closeDatabasePool = async () => {
  if (pool) {
    await pool.end()
    pool = null
  }
}
