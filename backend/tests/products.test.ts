import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

// Test files run in parallel against one database, so these tests create their own
// products with a unique prefix and always filter on it to get predictable counts.
const PREFIX = 'Pagetest'

const listProducts = (query: Record<string, string | number>) =>
  request(app)
    .get('/api/products')
    .query({ search: PREFIX, ...query })

beforeAll(async () => {
  const categories = await request(app).get('/api/categories')
  const officeId = categories.body.find((category: any) => category.slug === 'office').id

  const products = [
    { name: `${PREFIX} Alpha`, price: 10 },
    { name: `${PREFIX} Bravo`, price: 20, categoryId: officeId },
    { name: `${PREFIX} Charlie`, price: 30 },
    { name: `${PREFIX} Delta`, price: 40, categoryId: officeId },
    { name: `${PREFIX} Echo`, price: 50 },
    { name: `${PREFIX} Hidden`, price: 25, isActive: false },
  ]

  for (const product of products) {
    const response = await request(app)
      .post('/api/products')
      .send({ stock: 5, ...product })
    expect(response.status).toBe(201)
  }
})

describe('GET /api/products', () => {
  it('returns a page of products with pagination metadata and defaults', async () => {
    const response = await request(app).get('/api/products')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.pagination).toMatchObject({ page: 1, limit: 20 })
    expect(response.body.pagination.total).toBeGreaterThan(0)
  })

  it('returns the requested page and page counts', async () => {
    const response = await listProducts({ sort: 'price_asc', limit: 2, page: 2 })

    expect(response.status).toBe(200)
    expect(response.body.data.map((product: any) => product.name)).toEqual([`${PREFIX} Charlie`, `${PREFIX} Delta`])
    expect(response.body.pagination).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 })
  })

  it('returns an empty page past the end instead of an error', async () => {
    const response = await listProducts({ page: 99 })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
    expect(response.body.pagination.total).toBe(5)
  })

  it('excludes inactive products', async () => {
    const response = await listProducts({ limit: 100 })
    const names = response.body.data.map((product: any) => product.name)

    expect(names).not.toContain(`${PREFIX} Hidden`)
  })

  it('filters by category slug', async () => {
    const response = await listProducts({ category: 'office', sort: 'price_asc' })

    expect(response.body.data.map((product: any) => product.name)).toEqual([`${PREFIX} Bravo`, `${PREFIX} Delta`])
  })

  it('filters by price range (inclusive)', async () => {
    const response = await listProducts({ minPrice: 20, maxPrice: 40 })

    expect(response.body.pagination.total).toBe(3)
  })

  it('sorts by price descending', async () => {
    const response = await listProducts({ sort: 'price_desc', limit: 1 })

    expect(response.body.data[0].name).toBe(`${PREFIX} Echo`)
  })

  it('searches case-insensitively', async () => {
    const response = await request(app).get('/api/products').query({ search: 'pagetest ALPHA' })

    expect(response.body.data.map((product: any) => product.name)).toEqual([`${PREFIX} Alpha`])
  })

  it('treats % and _ in search as literal characters, not wildcards', async () => {
    const percent = await request(app).get('/api/products').query({ search: '%' })
    const underscore = await request(app).get('/api/products').query({ search: '_' })

    expect(percent.body.pagination.total).toBe(0)
    expect(underscore.body.pagination.total).toBe(0)
  })

  it.each([
    ['limit above the cap', { limit: 101 }],
    ['page below 1', { page: 0 }],
    ['unknown sort key', { sort: 'name; DROP TABLE products' }],
    ['non-numeric price', { minPrice: 'cheap' }],
    ['minPrice greater than maxPrice', { minPrice: 50, maxPrice: 10 }],
  ])('rejects %s with 400', async (_label, query) => {
    const response = await request(app).get('/api/products').query(query)

    expect(response.status).toBe(400)
  })
})
