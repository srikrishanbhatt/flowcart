import { Router } from 'express'
import { z } from 'zod'
import { productService } from '../services/product.service.js'
import { PRODUCT_SORTS } from '../types/product.js'

const router = Router()

const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
})

// Query-string values arrive as strings, so numbers are coerced. Every field is bounded:
// `limit` is capped so a client can't request the whole table in one call.
const listProductsSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(100).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    sort: z.enum(PRODUCT_SORTS).default('newest'),
  })
  .refine((query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice, {
    message: 'minPrice must be less than or equal to maxPrice',
    path: ['minPrice'],
  })

// GET /api/products?page=1&limit=20&category=office&search=lamp&minPrice=10&maxPrice=100&sort=price_asc
router.get('/', async (req, res, next) => {
  try {
    const query = listProductsSchema.parse(req.query)
    const products = await productService.listProducts(query)
    res.status(200).json(products)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const payload = createProductSchema.parse(req.body)
    const product = await productService.createProduct(payload)
    res.status(201).json(product)
  } catch (error) {
    next(error)
  }
})

export default router
