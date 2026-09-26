import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { userRepository } from '../repositories/user.repository.js'
import env from '../config/env.js'
import type { User } from '../types/user.js'

export type RegisterInput = {
  email: string
  password: string
  role?: 'CUSTOMER' | 'ADMIN'
}

export type LoginInput = {
  email: string
  password: string
}

export type AuthTokenPayload = {
  sub: number
  email: string
  role: User['role']
}

const buildToken = (user: User) => {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  }

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

export class AuthService {
  async register(input: RegisterInput) {
    const normalizedEmail = input.email.trim().toLowerCase()
    const existingUser = await userRepository.findByEmail(normalizedEmail)

    if (existingUser) {
      const error = new Error('User already exists') as Error & { statusCode?: number }
      error.statusCode = 409
      throw error
    }

    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = await userRepository.createUser({
      email: normalizedEmail,
      passwordHash,
      role: input.role ?? 'CUSTOMER',
    })

    const token = buildToken(user)

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    }
  }

  async login(input: LoginInput) {
    const normalizedEmail = input.email.trim().toLowerCase()
    const user = await userRepository.findByEmail(normalizedEmail)

    if (!user) {
      const error = new Error('Invalid email or password') as Error & { statusCode?: number }
      error.statusCode = 401
      throw error
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash)

    if (!isPasswordValid) {
      const error = new Error('Invalid email or password') as Error & { statusCode?: number }
      error.statusCode = 401
      throw error
    }

    const token = buildToken(user)

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    }
  }

  async getCurrentUser(token: string) {
    let email: string

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET)

      if (typeof decoded === 'string' || typeof decoded.email !== 'string') {
        throw new Error('Malformed token payload')
      }

      email = decoded.email
    } catch {
      const error = new Error('Invalid or expired token') as Error & { statusCode?: number }
      error.statusCode = 401
      throw error
    }

    const user = await userRepository.findByEmail(email)

    if (!user) {
      const error = new Error('User not found') as Error & { statusCode?: number }
      error.statusCode = 404
      throw error
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }
  }
}

export const authService = new AuthService()
