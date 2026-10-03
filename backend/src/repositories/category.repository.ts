import { query } from '../config/database.js'
import type { Category, CreateCategoryInput } from '../types/category.js'

type CategoryRow = {
  id: number | string
  name: string
  slug: string
  createdAt: string
}

const toCategory = (row: CategoryRow): Category => ({
  id: Number(row.id),
  name: row.name,
  slug: row.slug,
  createdAt: new Date(row.createdAt).toISOString(),
})

export class CategoryRepository {
  async listCategories(): Promise<Category[]> {
    const result = await query<CategoryRow>(
      `SELECT id, name, slug, created_at as "createdAt"
       FROM categories
       ORDER BY created_at DESC`,
    )

    return result.rows.map(toCategory)
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const slug = input.name.toLowerCase().replace(/\s+/g, '-')

    const result = await query<CategoryRow>(
      `INSERT INTO categories (name, slug)
       VALUES ($1, $2)
       RETURNING id, name, slug, created_at as "createdAt"`,
      [input.name, slug],
    )

    return toCategory(result.rows[0])
  }
}

export const categoryRepository = new CategoryRepository()
