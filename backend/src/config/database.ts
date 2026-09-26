import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { Pool } from 'pg'
import env from './env.js'

type QueryResult = {
  rows: any[]
  rowCount: number
}

type DatabasePool = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult> | QueryResult
  end: () => Promise<void>
  isInitialized?: boolean
  database?: any
}

let pool: DatabasePool | null = null

const isPostgresUrl = (value?: string) => Boolean(value && /^(postgres|postgresql):\/\//i.test(value))

export const isDatabaseInitialized = (databasePool: any) => Boolean(databasePool?.database?._flowcartInitialized || databasePool?.isInitialized)

const resolveSQLitePath = () => {
  const url = env.DATABASE_URL ?? 'sqlite:./flowcart.db'
  const rawPath = url.startsWith('sqlite:') ? url.replace(/^sqlite:/, '') : url
  return path.resolve(process.cwd(), rawPath)
}

const normalizeSqliteQuery = (sql: string, params: unknown[] = []) => {
  const normalizedSql = sql.trim().replace(/\$\d+/g, '?')
  return { sql: normalizedSql, params }
}

const executeSqliteQuery = (database: Database.Database, sql: string, params: unknown[] = []) => {
  const { sql: sqliteSql, params: sqliteParams } = normalizeSqliteQuery(sql, params)
  const statement = database.prepare(sqliteSql)

  if (/\bRETURNING\b/i.test(sqliteSql)) {
    const rows = sqliteParams.length > 0 ? statement.all(...sqliteParams) : statement.all()
    return { rows, rowCount: rows.length }
  }

  if (/^\s*SELECT\b/i.test(sqliteSql)) {
    const rows = sqliteParams.length > 0 ? statement.all(...sqliteParams) : statement.all()
    return { rows, rowCount: rows.length }
  }

  if (/^\s*(CREATE|ALTER|DROP|PRAGMA|BEGIN|COMMIT)\b/i.test(sqliteSql)) {
    const result = sqliteParams.length > 0 ? statement.run(...sqliteParams) : statement.run()
    return { rows: [], rowCount: Number(result.changes ?? 0) }
  }

  if (/^\s*(INSERT|UPDATE|DELETE)\b/i.test(sqliteSql)) {
    const result = sqliteParams.length > 0 ? statement.run(...sqliteParams) : statement.run()
    return { rows: [], rowCount: Number(result.changes ?? 0) }
  }

  const rows = sqliteParams.length > 0 ? statement.all(...sqliteParams) : statement.all()
  return { rows, rowCount: rows.length }
}

const createSqlitePool = (): DatabasePool => {
  const sqlitePath = resolveSQLitePath()
  const sqliteDirectory = path.dirname(sqlitePath)
  fs.mkdirSync(sqliteDirectory, { recursive: true })

  const database = new Database(sqlitePath)
  ;(database as any)._flowcartInitialized = false
  database.pragma('journal_mode = WAL')

  return {
    database,
    query: (sql: string, params: unknown[] = []) => executeSqliteQuery(database, sql, params),
    end: async () => {
      database.close()
      pool = null
    },
  }
}

const createPostgresPool = (): DatabasePool => {
  const connectionString =
    env.DATABASE_URL ??
    `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`
  const pgPool = new Pool({ connectionString })

  return {
    query: async (sql: string, params: unknown[] = []) => {
      const result = await pgPool.query(sql, params)
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? result.rows.length,
      }
    },
    end: async () => {
      await pgPool.end()
      pool = null
    },
    isInitialized: false,
  }
}

export const getDatabasePool = () => {
  if (pool) {
    return pool
  }

  const databaseUrl =
    env.DATABASE_URL ??
    `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`

  if (isPostgresUrl(databaseUrl) || env.DB_CLIENT === 'postgres') {
    pool = createPostgresPool()
    return pool
  }

  pool = createSqlitePool()
  return pool
}

export const isDatabaseAvailable = async (): Promise<boolean> => {
  const databasePool = getDatabasePool()

  if (!databasePool) {
    return false
  }

  try {
    await databasePool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

export const initializeDatabase = async () => {
  const databasePool = getDatabasePool()

  if (!databasePool) {
    return
  }

  if (isDatabaseInitialized(databasePool)) {
    return
  }

  if (isPostgresUrl(env.DATABASE_URL) || env.DB_CLIENT === 'postgres') {
    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'CUSTOMER',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        price NUMERIC(10,2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        category_id INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        total NUMERIC(12,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const userCount = await databasePool.query('SELECT COUNT(*) AS count FROM users')
    if (Number(userCount.rows[0].count) === 0) {
      await databasePool.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)`,
        ['admin@flowcart.dev', 'demo-password-hash', 'ADMIN'],
      )
    }

    const categoryCount = await databasePool.query('SELECT COUNT(*) AS count FROM categories')
    if (Number(categoryCount.rows[0].count) === 0) {
      await databasePool.query(
        `INSERT INTO categories (name, slug) VALUES ($1, $2), ($3, $4)
         ON CONFLICT (slug) DO NOTHING`,
        ['Accessories', 'accessories', 'Office', 'office'],
      )
    }

    const productCount = await databasePool.query('SELECT COUNT(*) AS count FROM products')
    if (Number(productCount.rows[0].count) === 0) {
      await databasePool.query(
        `INSERT INTO products (name, slug, description, price, stock, category_id, is_active)
         VALUES ($1, $2, $3, $4, $5, (SELECT id FROM categories WHERE slug = $6), $7),
                ($8, $9, $10, $11, $12, (SELECT id FROM categories WHERE slug = $13), $14),
                ($15, $16, $17, $18, $19, (SELECT id FROM categories WHERE slug = $20), $21),
                ($22, $23, $24, $25, $26, (SELECT id FROM categories WHERE slug = $27), $28)
         ON CONFLICT (slug) DO NOTHING`,
        [
          'FlowCart Pro Headset',
          'flowcart-pro-headset',
          'Wireless headset for daily productivity and immersive calls.',
          129.99,
          18,
          'accessories',
          true,
          'Ergo Desk Mat',
          'ergo-desk-mat',
          'Comfortable work surface for long coding and design sessions.',
          69,
          24,
          'accessories',
          true,
          'Daily Planner Kit',
          'daily-planner-kit',
          'Premium planner and stationery set for organized routines.',
          39.5,
          10,
          'office',
          true,
          'Focus Lamp Pro',
          'focus-lamp-pro',
          'Warm, adjustable lighting that helps you stay on task through long sessions.',
          88,
          12,
          'office',
          true,
        ],
      )
    }

    databasePool.isInitialized = true
    return
  }

  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CUSTOMER',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const userCount = await databasePool.query('SELECT COUNT(*) AS count FROM users')
  if (Number(userCount.rows[0].count) === 0) {
    await databasePool.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ('admin@flowcart.dev', 'demo-password-hash', 'ADMIN')
    `)
  }

  const categoryCount = await databasePool.query('SELECT COUNT(*) AS count FROM categories')
  if (Number(categoryCount.rows[0].count) === 0) {
    await databasePool.query(`
      INSERT INTO categories (name, slug)
      VALUES ('Accessories', 'accessories'), ('Office', 'office')
      ON CONFLICT(slug) DO NOTHING
    `)
  }

  const productCount = await databasePool.query('SELECT COUNT(*) AS count FROM products')
  if (Number(productCount.rows[0].count) === 0) {
    await databasePool.query(`
      INSERT INTO products (name, slug, description, price, stock, category_id, is_active)
      VALUES
        ('FlowCart Pro Headset', 'flowcart-pro-headset', 'Wireless headset for daily productivity and immersive calls.', 129.99, 18, (SELECT id FROM categories WHERE slug = 'accessories'), 1),
        ('Ergo Desk Mat', 'ergo-desk-mat', 'Comfortable work surface for long coding and design sessions.', 69.00, 24, (SELECT id FROM categories WHERE slug = 'accessories'), 1),
        ('Daily Planner Kit', 'daily-planner-kit', 'Premium planner and stationery set for organized routines.', 39.50, 10, (SELECT id FROM categories WHERE slug = 'office'), 1),
        ('Focus Lamp Pro', 'focus-lamp-pro', 'Warm, adjustable lighting that helps you stay on task through long sessions.', 88.00, 12, (SELECT id FROM categories WHERE slug = 'office'), 1)
      ON CONFLICT(slug) DO NOTHING
    `)
  }

  ;(databasePool.database as any)._flowcartInitialized = true
}

export const closeDatabasePool = async () => {
  if (pool) {
    await pool.end()
    pool = null
  }
}
