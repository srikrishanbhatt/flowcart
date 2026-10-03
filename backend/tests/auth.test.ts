import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('Auth API', () => {
  it('registers a new user and returns a token', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'newuser@example.com',
      password: 'secret123',
      role: 'CUSTOMER',
    })

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('token')
    expect(response.body.user.email).toBe('newuser@example.com')
  })

  it('logs in an existing user', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'newuser@example.com',
      password: 'secret123',
    })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('token')
    expect(response.body.user.email).toBe('newuser@example.com')
  })

  it('returns the current user when a valid token is provided', async () => {
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'newuser@example.com',
      password: 'secret123',
    })

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${loginResponse.body.token}`)

    expect(response.status).toBe(200)
    expect(response.body.email).toBe('newuser@example.com')
  })
})
