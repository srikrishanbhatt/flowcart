import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('Cart and Orders API', () => {
  it('returns seeded products from the live database', async () => {
    const response = await request(app).get('/api/products')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body[0]).toHaveProperty('name')
  })

  it('returns an empty cart list', async () => {
    const response = await request(app).get('/api/cart')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })

  it('returns an empty orders list', async () => {
    const response = await request(app).get('/api/orders')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })

  it('merges duplicate cart items for the same product', async () => {
    const createProductResponse = await request(app).post('/api/products').send({
      name: 'Wireless Mouse',
      price: 29.99,
      stock: 10,
    })

    expect(createProductResponse.status).toBe(201)

    const firstAdd = await request(app).post('/api/cart/1').send({
      productId: createProductResponse.body.id,
      quantity: 1,
    })

    const secondAdd = await request(app).post('/api/cart/1').send({
      productId: createProductResponse.body.id,
      quantity: 2,
    })

    expect(firstAdd.status).toBe(201)
    expect(secondAdd.status).toBe(201)

    const cartResponse = await request(app).get('/api/cart')

    expect(cartResponse.status).toBe(200)

    const cartItems = cartResponse.body.flatMap((cart: any) => cart.items)
    const productItems = cartItems.filter(
      (item: any) => Number(item.productId) === Number(createProductResponse.body.id),
    )

    expect(productItems).toHaveLength(1)
    expect(productItems[0].quantity).toBe(3)
  })

  it('rejects creating an order when product stock is insufficient', async () => {
    const createProductResponse = await request(app).post('/api/products').send({
      name: 'Laptop Stand',
      price: 49.99,
      stock: 1,
    })

    expect(createProductResponse.status).toBe(201)

    const response = await request(app).post('/api/orders').send({
      userId: 1,
      items: [{ productId: createProductResponse.body.id, quantity: 2, unitPrice: 49.99 }],
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/stock|insufficient/i)
  })

  it('updates an order status', async () => {
    const orderResponse = await request(app).post('/api/orders').send({
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
    const response = await request(app).post('/api/orders').send({
      userId: 1,
      items: [
        { productId, quantity: 1, unitPrice: 59.99 },
        { productId, quantity: 1, unitPrice: 59.99 },
      ],
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/stock/i)

    const products = await request(app).get('/api/products')
    const product = products.body.find((item: any) => Number(item.id) === Number(productId))
    expect(Number(product.stock)).toBe(1)

    const ordersAfter = await request(app).get('/api/orders')
    expect(ordersAfter.body).toHaveLength(ordersBefore.body.length)
  })
})
