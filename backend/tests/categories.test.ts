import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('Categories API', () => {
  it('returns a list of categories', async () => {
    const response = await request(app).get('/api/categories')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })
})
