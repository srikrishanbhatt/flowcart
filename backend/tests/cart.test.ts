import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { createProduct, registerUser } from './helpers.js'

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

describe('Cart API authentication', () => {
  it.each([
    ['no token', {}],
    ['a malformed header', { Authorization: 'Token abc' }],
    ['an invalid token', { Authorization: 'Bearer not-a-real-jwt' }],
  ])('rejects requests with %s (401)', async (_label, headers) => {
    const response = await request(app).get('/api/cart').set(headers)

    expect(response.status).toBe(401)
  })

  it('no longer accepts a user id in the URL', async () => {
    const { token } = await registerUser()
    const response = await request(app).post('/api/cart/1').set(auth(token)).send({ productId: 1 })

    expect(response.status).toBe(404)
  })
})

describe('Cart API', () => {
  it('starts empty for a new user', async () => {
    const { token, user } = await registerUser()
    const response = await request(app).get('/api/cart').set(auth(token))

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ userId: user.id, items: [] })
  })

  it('adds items and merges quantities for the same product', async () => {
    const { token } = await registerUser()
    const product = await createProduct('Cart Mouse')

    await request(app).post('/api/cart/items').set(auth(token)).send({ productId: product.id })
    const response = await request(app)
      .post('/api/cart/items')
      .set(auth(token))
      .send({ productId: product.id, quantity: 2 })

    expect(response.status).toBe(200)
    expect(response.body.items).toEqual([{ productId: product.id, quantity: 3 }])
  })

  it('persists the cart across requests (survives a page refresh)', async () => {
    const { token } = await registerUser()
    const product = await createProduct('Cart Lamp')
    await request(app).post('/api/cart/items').set(auth(token)).send({ productId: product.id })

    const response = await request(app).get('/api/cart').set(auth(token))

    expect(response.body.items).toEqual([{ productId: product.id, quantity: 1 }])
  })

  it('sets the quantity of an item', async () => {
    const { token } = await registerUser()
    const product = await createProduct('Cart Stand')
    await request(app).post('/api/cart/items').set(auth(token)).send({ productId: product.id })

    const response = await request(app).patch(`/api/cart/items/${product.id}`).set(auth(token)).send({ quantity: 5 })

    expect(response.status).toBe(200)
    expect(response.body.items).toEqual([{ productId: product.id, quantity: 5 }])
  })

  it('returns 404 when setting the quantity of a product not in the cart', async () => {
    const { token } = await registerUser()
    const product = await createProduct('Cart Absent')

    const response = await request(app).patch(`/api/cart/items/${product.id}`).set(auth(token)).send({ quantity: 2 })

    expect(response.status).toBe(404)
  })

  it('removes an item, and removing it again still succeeds (idempotent)', async () => {
    const { token } = await registerUser()
    const product = await createProduct('Cart Cable')
    await request(app).post('/api/cart/items').set(auth(token)).send({ productId: product.id })

    const first = await request(app).delete(`/api/cart/items/${product.id}`).set(auth(token))
    const second = await request(app).delete(`/api/cart/items/${product.id}`).set(auth(token))

    expect(first.status).toBe(200)
    expect(first.body.items).toEqual([])
    expect(second.status).toBe(200)
  })

  it('clears the whole cart', async () => {
    const { token } = await registerUser()
    const first = await createProduct('Cart Clear A')
    const second = await createProduct('Cart Clear B')
    await request(app).post('/api/cart/items').set(auth(token)).send({ productId: first.id })
    await request(app).post('/api/cart/items').set(auth(token)).send({ productId: second.id })

    const response = await request(app).delete('/api/cart').set(auth(token))

    expect(response.body.items).toEqual([])
  })

  it('returns 404 for a product that does not exist or is inactive', async () => {
    const { token } = await registerUser()
    const inactive = await createProduct('Cart Inactive', { isActive: false })

    const missing = await request(app).post('/api/cart/items').set(auth(token)).send({ productId: 999999 })
    const hidden = await request(app).post('/api/cart/items').set(auth(token)).send({ productId: inactive.id })

    expect(missing.status).toBe(404)
    expect(hidden.status).toBe(404)
  })

  it.each([
    ['quantity 0', { quantity: 0 }],
    ['quantity above 99', { quantity: 100 }],
    ['a non-integer quantity', { quantity: 1.5 }],
  ])('rejects %s with 400', async (_label, body) => {
    const { token } = await registerUser()
    const product = await createProduct('Cart Invalid')

    const response = await request(app)
      .post('/api/cart/items')
      .set(auth(token))
      .send({ productId: product.id, ...body })

    expect(response.status).toBe(400)
  })

  it("keeps each user's cart separate", async () => {
    const alice = await registerUser()
    const bob = await registerUser()
    const product = await createProduct('Cart Private')
    await request(app).post('/api/cart/items').set(auth(alice.token)).send({ productId: product.id })

    const bobCart = await request(app).get('/api/cart').set(auth(bob.token))
    const bobRemove = await request(app).delete(`/api/cart/items/${product.id}`).set(auth(bob.token))
    const aliceCart = await request(app).get('/api/cart').set(auth(alice.token))

    expect(bobCart.body.items).toEqual([])
    expect(bobRemove.status).toBe(200)
    expect(aliceCart.body.items).toEqual([{ productId: product.id, quantity: 1 }])
  })

  it('keeps one cart and one line per product when adds happen concurrently', async () => {
    const { token } = await registerUser()
    const product = await createProduct('Cart Concurrent')

    // 25 simultaneous requests: enough overlap that check-then-insert reliably races here
    // (verified: the old implementation fails this test, the upsert passes).
    const responses = await Promise.all(
      Array.from({ length: 25 }, () =>
        request(app).post('/api/cart/items').set(auth(token)).send({ productId: product.id }),
      ),
    )
    expect(responses.every((response) => response.status === 200)).toBe(true)

    const cart = await request(app).get('/api/cart').set(auth(token))

    expect(cart.body.items).toEqual([{ productId: product.id, quantity: 25 }])
  })
})
