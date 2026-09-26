import { getDatabasePool, initializeDatabase, isDatabaseInitialized } from '../config/database.js'
import type { CreateUserInput, User } from '../types/user.js'

const getReadyDatabasePool = async () => {
  let databasePool = getDatabasePool()

  if (!databasePool || !isDatabaseInitialized(databasePool)) {
    await initializeDatabase()
    databasePool = getDatabasePool()
  }

  return databasePool
}

type UserRow = {
  id: number | string
  email: string
  passwordHash: string
  role: string
  createdAt: string
}

const inMemoryUsers: User[] = []

export class UserRepository {
  async listUsers(): Promise<User[]> {
    const databasePool = await getReadyDatabasePool()

    if (!databasePool) {
      return inMemoryUsers
    }

    const result = await databasePool.query(
      `SELECT id, email, password_hash as "passwordHash", role, created_at as "createdAt"
       FROM users
       ORDER BY created_at DESC`,
    )

    return result.rows.map((row: UserRow) => ({
      id: Number(row.id),
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role as User['role'],
      createdAt: new Date(row.createdAt).toISOString(),
    }))
  }

  async findByEmail(email: string): Promise<User | null> {
    const databasePool = await getReadyDatabasePool()
    const normalizedEmail = email.toLowerCase()

    if (!databasePool) {
      return inMemoryUsers.find((user) => user.email.toLowerCase() === normalizedEmail) ?? null
    }

    const result = await databasePool.query(
      `SELECT id, email, password_hash as "passwordHash", role, created_at as "createdAt"
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalizedEmail],
    )

    const row: UserRow | undefined = result.rows[0]

    if (!row) {
      return null
    }

    return {
      id: Number(row.id),
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role as User['role'],
      createdAt: new Date(row.createdAt).toISOString(),
    }
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const databasePool = await getReadyDatabasePool()

    if (!databasePool) {
      const generatedUser: User = {
        id: inMemoryUsers.length + 1,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role ?? 'CUSTOMER',
        createdAt: new Date().toISOString(),
      }

      inMemoryUsers.push(generatedUser)
      return generatedUser
    }

    const result = await databasePool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, password_hash as "passwordHash", role, created_at as "createdAt"`,
      [input.email, input.passwordHash, input.role ?? 'CUSTOMER'],
    )

    const row: UserRow = result.rows[0]

    return {
      id: Number(row.id),
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role as User['role'],
      createdAt: new Date(row.createdAt).toISOString(),
    }
  }
}

export const userRepository = new UserRepository()
