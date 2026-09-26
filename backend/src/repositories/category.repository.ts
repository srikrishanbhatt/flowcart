import { getDatabasePool, initializeDatabase, isDatabaseInitialized } from '../config/database.js'
import type { Category, CreateCategoryInput } from '../types/category.js'

const getReadyDatabasePool = async () => {
  let databasePool = getDatabasePool()

  if (!databasePool || !isDatabaseInitialized(databasePool)) {
    await initializeDatabase()
    databasePool = getDatabasePool()
  }

  return databasePool
}

type CategoryRow = {
  id: number | string
  name: string
  slug: string
  createdAt: string
}

const inMemoryCategories: Category[] = []

export class CategoryRepository {
  async listCategories(): Promise<Category[]> {
    const databasePool = await getReadyDatabasePool()

    if (!databasePool) {
      return inMemoryCategories
    }

    const result = await databasePool.query(
      `SELECT id, name, slug, created_at as "createdAt"
       FROM categories
       ORDER BY created_at DESC`,
    )

    return result.rows.map((row: CategoryRow) => ({
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      createdAt: new Date(row.createdAt).toISOString(),
    }))
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const databasePool = await getReadyDatabasePool()

    if (!databasePool) {
      const generatedCategory: Category = {
        id: inMemoryCategories.length + 1,
        name: input.name,
        slug: input.name.toLowerCase().replace(/\s+/g, '-'),
        createdAt: new Date().toISOString(),
      }

      inMemoryCategories.push(generatedCategory)
      return generatedCategory
    }

    const slug = input.name.toLowerCase().replace(/\s+/g, '-')

    const result = await databasePool.query(
      `INSERT INTO categories (name, slug)
       VALUES ($1, $2)
       RETURNING id, name, slug, created_at as "createdAt"`,
      [input.name, slug],
    )

    const row: CategoryRow = result.rows[0]

    return {
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      createdAt: new Date(row.createdAt).toISOString(),
    }
  }
}

export const categoryRepository = new CategoryRepository()
