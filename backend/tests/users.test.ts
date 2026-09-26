import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('Users API', () => {
  it('returns a list of users', async () => {
    const response = await request(app).get('/api/users')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })
})
