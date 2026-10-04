// Shows what the product indexes buy us: inserts 100k products, times the listing queries
// with and without the indexes, then ROLLS BACK so the database is left exactly as it was.
// Postgres DDL (CREATE/DROP INDEX) is transactional, which is what makes this possible.
//
// Usage: npm run bench:indexes
// Note: while it runs, the products table is locked, so a running API will wait on it.
import pg from 'pg'
import env from '../src/config/env.js'

const BULK_ROWS = 100_000
const PRODUCT_INDEXES = [
  'idx_products_category_id',
  'idx_products_active_newest',
  'idx_products_active_price',
  'idx_products_name_trgm',
]

const QUERIES: Array<{ label: string; sql: string }> = [
  {
    label: 'Category page, newest first',
    sql: `SELECT id FROM products
          WHERE is_active = true AND category_id = (SELECT id FROM categories WHERE slug = 'bench-cat-7')
          ORDER BY created_at DESC, id DESC LIMIT 20`,
  },
  {
    label: "Search ILIKE '%mouse 4242%'",
    sql: `SELECT id FROM products
          WHERE is_active = true AND name ILIKE '%mouse 4242%'
          ORDER BY created_at DESC, id DESC LIMIT 20`,
  },
  {
    label: 'All products, cheapest first',
    sql: `SELECT id FROM products WHERE is_active = true ORDER BY price ASC, id ASC LIMIT 20`,
  },
  {
    label: 'Deep page (OFFSET 90,000)',
    sql: `SELECT id FROM products WHERE is_active = true
          ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 90000`,
  },
]

type PlanNode = { 'Node Type': string; 'Index Name'?: string; Plans?: PlanNode[] }

// Collects the scan steps from the plan tree, e.g. "Seq Scan" or "Index Scan (idx_...)".
const scansIn = (node: PlanNode): string[] => {
  const own = node['Node Type'].includes('Scan')
    ? [node['Index Name'] ? `${node['Node Type']} (${node['Index Name']})` : node['Node Type']]
    : []
  return [...own, ...(node.Plans ?? []).flatMap(scansIn)]
}

const measure = async (client: pg.Client, sql: string) => {
  let best = Infinity
  let scans: string[] = []

  // Best of 3 runs, so the first run's cold cache doesn't skew the comparison.
  for (let run = 0; run < 3; run++) {
    const result = await client.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`)
    const [{ Plan, 'Execution Time': ms }] = result.rows[0]['QUERY PLAN']
    if (ms < best) best = ms
    scans = [...new Set(scansIn(Plan))].filter((scan) => !scan.includes('categories'))
  }

  return { ms: best, scans }
}

const run = async () => {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to run the benchmark against production')
  }

  const client = new pg.Client({ connectionString: env.DATABASE_URL })
  await client.connect()

  try {
    await client.query('BEGIN')

    console.log(`Inserting ${BULK_ROWS.toLocaleString()} products (inside a transaction)...`)
    await client.query(`
      INSERT INTO categories (name, slug)
      SELECT 'Bench Category ' || i, 'bench-cat-' || i FROM generate_series(1, 50) AS i`)
    await client.query(
      `
      INSERT INTO products (name, slug, description, price, stock, category_id, created_at)
      SELECT
        (ARRAY['Desk', 'Lamp', 'Mouse', 'Keyboard', 'Chair', 'Monitor', 'Cable', 'Stand'])[1 + n % 8] || ' ' || n,
        'bench-product-' || n,
        'Benchmark product',
        round((1 + random() * 500)::numeric, 2),
        10,
        (SELECT id FROM categories WHERE slug = 'bench-cat-' || (1 + n % 50)),
        NOW() - n * INTERVAL '1 minute'
      FROM generate_series(1, $1) AS n`,
      [BULK_ROWS],
    )
    // Refresh planner statistics so it knows the table is now large.
    await client.query('ANALYZE products')

    const withIndexes = []
    for (const { sql } of QUERIES) withIndexes.push(await measure(client, sql))

    await client.query(`DROP INDEX ${PRODUCT_INDEXES.join(', ')}`)

    const withoutIndexes = []
    for (const { sql } of QUERIES) withoutIndexes.push(await measure(client, sql))

    console.log()
    QUERIES.forEach(({ label }, index) => {
      const fast = withIndexes[index]
      const slow = withoutIndexes[index]
      console.log(label)
      console.log(`  without indexes: ${slow.ms.toFixed(2).padStart(8)} ms   ${slow.scans.join(', ')}`)
      console.log(`  with indexes:    ${fast.ms.toFixed(2).padStart(8)} ms   ${fast.scans.join(', ')}`)
      console.log()
    })
  } finally {
    await client.query('ROLLBACK')
    await client.end()
    console.log('Rolled back: bulk rows and dropped indexes are undone.')
  }
}

await run()
