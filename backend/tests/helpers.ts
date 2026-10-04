import { randomUUID } from 'node:crypto'
import request from 'supertest'
import app from '../src/app.js'

// Registers a brand-new customer so each test gets its own isolated user (and cart).
export const registerUser = async () => {
  const email = `user-${randomUUID()}@example.com`
  const response = await request(app).post('/api/auth/register').send({ email, password: 'secret123' })

  if (response.status !== 201) {
    throw new Error(`Registration failed: ${response.status} ${JSON.stringify(response.body)}`)
  }

  return { token: response.body.token as string, user: response.body.user as { id: number; email: string } }
}

export const createProduct = async (name: string, overrides: Record<string, unknown> = {}) => {
  const response = await request(app)
    .post('/api/products')
    .send({ name: `${name} ${randomUUID().slice(0, 8)}`, price: 10, stock: 50, ...overrides })

  if (response.status !== 201) {
    throw new Error(`Product creation failed: ${response.status} ${JSON.stringify(response.body)}`)
  }

  return response.body as { id: number; name: string }
}
