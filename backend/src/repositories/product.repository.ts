import { query } from '../config/database.js'
import type { CreateProductInput, Product, ProductListQuery, ProductSort } from '../types/product.js'

type ProductRow = {
  id: number | string
  name: string
  slug: string
  description: string | null
  price: number | string
  stock: number | string
  categoryId: number | string | null
  isActive: boolean
  createdAt: string
}

const toProduct = (row: ProductRow): Product => ({
  id: Number(row.id),
  name: row.name,
  slug: row.slug,
  description: row.description ?? '',
  price: Number(row.price),
  stock: Number(row.stock),
  categoryId: row.categoryId !== null ? Number(row.categoryId) : null,
  isActive: row.isActive,
  createdAt: new Date(row.createdAt).toISOString(),
})

// ORDER BY can't take $n parameters (they're for values, not column names), so user input
// must never be interpolated there. Instead, clients pick a key and we map it to fixed SQL.
// Every sort ends with id so rows with equal values keep a stable order across pages.
const SORT_SQL: Record<ProductSort, string> = {
  newest: 'created_at DESC, id DESC',
  price_asc: 'price ASC, id ASC',
  price_desc: 'price DESC, id DESC',
  name_asc: 'name ASC, id ASC',
}

// In ILIKE patterns, % and _ are wildcards. Escape them so searching for "50%" means a literal "50%".
const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`)

export class ProductRepository {
  async listProducts(filters: ProductListQuery): Promise<{ products: Product[]; total: number }> {
    // Customers only see active products. Written as a literal so the partial indexes apply.
    const conditions = ['is_active = true']
    const params: unknown[] = []

    // Each filter adds its value to params and refers to it by position ($1, $2, ...).
    const addParam = (value: unknown) => {
      params.push(value)
      return `$${params.length}`
    }

    if (filters.category) {
      conditions.push(`category_id = (SELECT id FROM categories WHERE slug = ${addParam(filters.category)})`)
    }

    if (filters.search) {
      conditions.push(`name ILIKE ${addParam(`%${escapeLikePattern(filters.search)}%`)}`)
    }

    if (filters.minPrice !== undefined) {
      conditions.push(`price >= ${addParam(filters.minPrice)}`)
    }

    if (filters.maxPrice !== undefined) {
      conditions.push(`price <= ${addParam(filters.maxPrice)}`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    // Two queries: the page of rows, and the total for page counts. Both share the same filters.
    const countResult = await query<{ total: string }>(`SELECT COUNT(*) AS total FROM products ${where}`, params)

    const pageParams = [...params]
    const limitParam = `$${pageParams.push(filters.limit)}`
    const offsetParam = `$${pageParams.push((filters.page - 1) * filters.limit)}`

    const result = await query<ProductRow>(
      `SELECT id, name, slug, description, price, stock, category_id as "categoryId", is_active as "isActive", created_at as "createdAt"
       FROM products
       ${where}
       ORDER BY ${SORT_SQL[filters.sort]}
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      pageParams,
    )

    return { products: result.rows.map(toProduct), total: Number(countResult.rows[0].total) }
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const slug = input.name.toLowerCase().replace(/\s+/g, '-')

    const result = await query<ProductRow>(
      `INSERT INTO products (name, slug, description, price, stock, category_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, slug, description, price, stock, category_id as "categoryId", is_active as "isActive", created_at as "createdAt"`,
      [
        input.name,
        slug,
        input.description ?? '',
        input.price,
        input.stock ?? 0,
        input.categoryId ?? null,
        input.isActive ?? true,
      ],
    )

    return toProduct(result.rows[0])
  }
}

export const productRepository = new ProductRepository()
