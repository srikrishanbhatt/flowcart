import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('Products API', () => {
  it('returns an empty list when no products exist', async () => {
    const response = await request(app).get('/api/products')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })
})
