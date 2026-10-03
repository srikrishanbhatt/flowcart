import { query } from '../config/database.js'
import type { CreateUserInput, User } from '../types/user.js'

type UserRow = {
  id: number | string
  email: string
  passwordHash: string
  role: string
  createdAt: string
}

const toUser = (row: UserRow): User => ({
  id: Number(row.id),
  email: row.email,
  passwordHash: row.passwordHash,
  role: row.role as User['role'],
  createdAt: new Date(row.createdAt).toISOString(),
})

export class UserRepository {
  async listUsers(): Promise<User[]> {
    const result = await query(
      `SELECT id, email, password_hash as "passwordHash", role, created_at as "createdAt"
       FROM users
       ORDER BY created_at DESC`,
    )

    return result.rows.map(toUser)
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, password_hash as "passwordHash", role, created_at as "createdAt"
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [email.toLowerCase()],
    )

    const row: UserRow | undefined = result.rows[0]
    return row ? toUser(row) : null
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const result = await query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, password_hash as "passwordHash", role, created_at as "createdAt"`,
      [input.email, input.passwordHash, input.role ?? 'CUSTOMER'],
    )

    return toUser(result.rows[0])
  }
}

export const userRepository = new UserRepository()
