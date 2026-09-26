export type Role = 'CUSTOMER' | 'ADMIN'

export type User = {
  id: number
  email: string
  passwordHash: string
  role: Role
  createdAt: string
}

export type CreateUserInput = {
  email: string
  passwordHash: string
  role?: Role
}
