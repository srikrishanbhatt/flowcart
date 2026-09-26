import { getDatabasePool } from '../config/database.js';
const inMemoryUsers = [];
export class UserRepository {
    async listUsers() {
        const databasePool = getDatabasePool();
        if (!databasePool) {
            return inMemoryUsers;
        }
        const result = await databasePool.query(`SELECT id, email, password_hash as "passwordHash", role, created_at as "createdAt"
       FROM users
       ORDER BY created_at DESC`);
        return result.rows.map((row) => ({
            id: Number(row.id),
            email: row.email,
            passwordHash: row.passwordHash,
            role: row.role,
            createdAt: new Date(row.createdAt).toISOString(),
        }));
    }
    async createUser(input) {
        const databasePool = getDatabasePool();
        if (!databasePool) {
            const generatedUser = {
                id: inMemoryUsers.length + 1,
                email: input.email,
                passwordHash: input.passwordHash,
                role: input.role ?? 'CUSTOMER',
                createdAt: new Date().toISOString(),
            };
            inMemoryUsers.push(generatedUser);
            return generatedUser;
        }
        const result = await databasePool.query(`INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, password_hash as "passwordHash", role, created_at as "createdAt"`, [input.email, input.passwordHash, input.role ?? 'CUSTOMER']);
        const row = result.rows[0];
        return {
            id: Number(row.id),
            email: row.email,
            passwordHash: row.passwordHash,
            role: row.role,
            createdAt: new Date(row.createdAt).toISOString(),
        };
    }
}
export const userRepository = new UserRepository();
