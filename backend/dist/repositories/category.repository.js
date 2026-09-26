import { getDatabasePool } from '../config/database.js';
const inMemoryCategories = [];
export class CategoryRepository {
    async listCategories() {
        const databasePool = getDatabasePool();
        if (!databasePool) {
            return inMemoryCategories;
        }
        const result = await databasePool.query(`SELECT id, name, slug, created_at as "createdAt"
       FROM categories
       ORDER BY created_at DESC`);
        return result.rows.map((row) => ({
            id: Number(row.id),
            name: row.name,
            slug: row.slug,
            createdAt: new Date(row.createdAt).toISOString(),
        }));
    }
    async createCategory(input) {
        const databasePool = getDatabasePool();
        if (!databasePool) {
            const generatedCategory = {
                id: inMemoryCategories.length + 1,
                name: input.name,
                slug: input.name.toLowerCase().replace(/\s+/g, '-'),
                createdAt: new Date().toISOString(),
            };
            inMemoryCategories.push(generatedCategory);
            return generatedCategory;
        }
        const slug = input.name.toLowerCase().replace(/\s+/g, '-');
        const result = await databasePool.query(`INSERT INTO categories (name, slug)
       VALUES ($1, $2)
       RETURNING id, name, slug, created_at as "createdAt"`, [input.name, slug]);
        const row = result.rows[0];
        return {
            id: Number(row.id),
            name: row.name,
            slug: row.slug,
            createdAt: new Date(row.createdAt).toISOString(),
        };
    }
}
export const categoryRepository = new CategoryRepository();
