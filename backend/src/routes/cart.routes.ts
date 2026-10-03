import { Router } from 'express'
import { z } from 'zod'
import { cartService } from '../services/cart.service.js'

// Mounted at /api/cart
const router = Router()

const addToCartSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().optional(),
})

router.get('/', async (_req, res, next) => {
  try {
    const cart = await cartService.listCartItems()
    res.status(200).json(cart)
  } catch (error) {
    next(error)
  }
})

router.post('/:userId', async (req, res, next) => {
  try {
    const payload = addToCartSchema.parse(req.body)
    const cart = await cartService.addItemToCart(Number(req.params.userId), payload)
    res.status(201).json(cart)
  } catch (error) {
    next(error)
  }
})

export default router
