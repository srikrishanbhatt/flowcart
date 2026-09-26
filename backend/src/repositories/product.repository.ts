import { getDatabasePool, initializeDatabase, isDatabaseInitialized } from '../config/database.js'
import type { CreateProductInput, Product } from '../types/product.js'

const getReadyDatabasePool = async () => {
  let databasePool = getDatabasePool()

  if (!databasePool || !isDatabaseInitialized(databasePool)) {
    await initializeDatabase()
    databasePool = getDatabasePool()
  }

  return databasePool
}

type ProductRow = {
  id: number | string
  name: string
  slug: string
  description: string | null
  price: number | string
  stock: number | string
  categoryId: number | string | null
  isActive: boolean | string
  createdAt: string
}

const inMemoryProducts: Product[] = []

export class ProductRepository {
  async listProducts(): Promise<Product[]> {
    const databasePool = await getReadyDatabasePool()

    if (!databasePool) {
      return inMemoryProducts
    }

    const result = await databasePool.query(
      `SELECT id, name, slug, description, price, stock, category_id as "categoryId", is_active as "isActive", created_at as "createdAt"
       FROM products
       ORDER BY created_at DESC`,
    )

    return result.rows.map((row: ProductRow) => ({
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      description: row.description ?? '',
      price: Number(row.price),
      stock: Number(row.stock),
      categoryId: row.categoryId !== null ? Number(row.categoryId) : null,
      isActive: Boolean(row.isActive),
      createdAt: new Date(row.createdAt).toISOString(),
    }))
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const databasePool = await getReadyDatabasePool()

    if (!databasePool) {
      const generatedProduct: Product = {
        id: inMemoryProducts.length + 1,
        name: input.name,
        slug: input.name.toLowerCase().replace(/\s+/g, '-'),
        description: input.description ?? '',
        price: Number(input.price),
        stock: Number(input.stock ?? 0),
        categoryId: input.categoryId ?? null,
        isActive: input.isActive ?? true,
        createdAt: new Date().toISOString(),
      }

      inMemoryProducts.push(generatedProduct)
      return generatedProduct
    }

    const slug = input.name.toLowerCase().replace(/\s+/g, '-')

    const result = await databasePool.query(
      `INSERT INTO products (name, slug, description, price, stock, category_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, slug, description, price, stock, category_id as "categoryId", is_active as "isActive", created_at as "createdAt"`,
      [
        input.name,
        slug,
        input.description ?? '',
        Number(input.price),
        Number(input.stock ?? 0),
        input.categoryId ?? null,
        Number(input.isActive ?? true),
      ],
    )

    const row: ProductRow = result.rows[0]

    return {
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      description: row.description ?? '',
      price: Number(row.price),
      stock: Number(row.stock),
      categoryId: row.categoryId !== null ? Number(row.categoryId) : null,
      isActive: Boolean(row.isActive),
      createdAt: new Date(row.createdAt).toISOString(),
    }
  }
}

export const productRepository = new ProductRepository()
