import { Router } from 'express'
import { z } from 'zod'
import { productService } from '../services/product.service.js'

const router = Router()

const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
})

router.get('/products', async (_req, res, next) => {
  try {
    const products = await productService.listProducts()
    res.status(200).json(products)
  } catch (error) {
    next(error)
  }
})

router.post('/products', async (req, res, next) => {
  try {
    const payload = createProductSchema.parse(req.body)
    const product = await productService.createProduct(payload)
    res.status(201).json(product)
  } catch (error) {
    next(error)
  }
})

export default router
