import { query } from '../config/database.js'
import type { CreateProductInput, Product } from '../types/product.js'

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

export class ProductRepository {
  async listProducts(): Promise<Product[]> {
    const result = await query<ProductRow>(
      `SELECT id, name, slug, description, price, stock, category_id as "categoryId", is_active as "isActive", created_at as "createdAt"
       FROM products
       ORDER BY created_at DESC`,
    )

    return result.rows.map(toProduct)
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
