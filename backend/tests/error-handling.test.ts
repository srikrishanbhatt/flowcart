import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('Error handling', () => {
  it('returns 409 when creating a product whose slug already exists', async () => {
    const payload = { name: 'Duplicate Check Keyboard', price: 79.99, stock: 5 }

    const first = await request(app).post('/api/products').send(payload)
    const second = await request(app).post('/api/products').send(payload)

    expect(first.status).toBe(201)
    expect(second.status).toBe(409)
    expect(second.body.success).toBe(false)
  })

  it('returns 400 when the request body fails validation', async () => {
    const response = await request(app).post('/api/products').send({ name: 'No Price' })

    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/price/i)
  })
})
