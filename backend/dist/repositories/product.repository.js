import { getDatabasePool } from '../config/database.js';
const inMemoryProducts = [];
export class ProductRepository {
    async listProducts() {
        const databasePool = getDatabasePool();
        if (!databasePool) {
            return inMemoryProducts;
        }
        const result = await databasePool.query(`SELECT id, name, slug, description, price, stock, category_id as "categoryId", is_active as "isActive", created_at as "createdAt"
       FROM products
       ORDER BY created_at DESC`);
        return result.rows.map((row) => ({
            id: Number(row.id),
            name: row.name,
            slug: row.slug,
            description: row.description ?? '',
            price: Number(row.price),
            stock: Number(row.stock),
            categoryId: row.categoryId !== null ? Number(row.categoryId) : null,
            isActive: Boolean(row.isActive),
            createdAt: new Date(row.createdAt).toISOString(),
        }));
    }
    async createProduct(input) {
        const databasePool = getDatabasePool();
        if (!databasePool) {
            const generatedProduct = {
                id: inMemoryProducts.length + 1,
                name: input.name,
                slug: input.name.toLowerCase().replace(/\s+/g, '-'),
                description: input.description ?? '',
                price: Number(input.price),
                stock: Number(input.stock ?? 0),
                categoryId: input.categoryId ?? null,
                isActive: input.isActive ?? true,
                createdAt: new Date().toISOString(),
            };
            inMemoryProducts.push(generatedProduct);
            return generatedProduct;
        }
        const slug = input.name.toLowerCase().replace(/\s+/g, '-');
        const result = await databasePool.query(`INSERT INTO products (name, slug, description, price, stock, category_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, slug, description, price, stock, category_id as "categoryId", is_active as "isActive", created_at as "createdAt"`, [
            input.name,
            slug,
            input.description ?? '',
            Number(input.price),
            Number(input.stock ?? 0),
            input.categoryId ?? null,
            input.isActive ?? true,
        ]);
        const row = result.rows[0];
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
        };
    }
}
export const productRepository = new ProductRepository();
