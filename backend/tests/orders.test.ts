import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('Orders API', () => {
  it('returns seeded products from the live database', async () => {
    const response = await request(app).get('/api/products')

    expect(response.status).toBe(200)
    expect(response.body.data.length).toBeGreaterThan(0)
    expect(response.body.data[0]).toHaveProperty('name')
  })

  it('returns an empty orders list', async () => {
    const response = await request(app).get('/api/orders')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })

  it('rejects creating an order when product stock is insufficient', async () => {
    const createProductResponse = await request(app).post('/api/products').send({
      name: 'Laptop Stand',
      price: 49.99,
      stock: 1,
    })

    expect(createProductResponse.status).toBe(201)

    const response = await request(app)
      .post('/api/orders')
      .send({
        userId: 1,
        items: [{ productId: createProductResponse.body.id, quantity: 2, unitPrice: 49.99 }],
      })

    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/stock|insufficient/i)
  })

  it('updates an order status', async () => {
    const orderResponse = await request(app)
      .post('/api/orders')
      .send({
        userId: 1,
        items: [{ productId: 1, quantity: 1, unitPrice: 10 }],
      })

    expect(orderResponse.status).toBe(201)

    const response = await request(app).patch(`/api/orders/${orderResponse.body.id}/status`).send({
      status: 'PAID',
    })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('PAID')
  })

  it('rolls back the whole order when a later line runs out of stock', async () => {
    const createProductResponse = await request(app).post('/api/products').send({
      name: 'Last Unit Webcam',
      price: 59.99,
      stock: 1,
    })

    expect(createProductResponse.status).toBe(201)
    const productId = createProductResponse.body.id
    const ordersBefore = await request(app).get('/api/orders')

    // Each line passes the per-line stock check, but together they exceed stock.
    const response = await request(app)
      .post('/api/orders')
      .send({
        userId: 1,
        items: [
          { productId, quantity: 1, unitPrice: 59.99 },
          { productId, quantity: 1, unitPrice: 59.99 },
        ],
      })

    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/stock/i)

    const products = await request(app).get('/api/products').query({ search: 'Last Unit Webcam' })
    const product = products.body.data.find((item: any) => Number(item.id) === Number(productId))
    expect(Number(product.stock)).toBe(1)

    const ordersAfter = await request(app).get('/api/orders')
    expect(ordersAfter.body).toHaveLength(ordersBefore.body.length)
  })
})
