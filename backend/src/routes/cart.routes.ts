import { Router } from 'express'
import { z } from 'zod'
import { getAuthUser } from '../middleware/requireAuth.js'
import { cartService } from '../services/cart.service.js'

// Mounted at /api/cart behind requireAuth: every route acts on the logged-in user's cart.
const router = Router()

const addItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99).default(1),
})

// Quantity 0 is not allowed here; removing an item is an explicit DELETE.
const setQuantitySchema = z.object({
  quantity: z.number().int().min(1).max(99),
})

const productIdParam = z.coerce.number().int().positive()

// GET /api/cart: the current user's cart
router.get('/', async (req, res, next) => {
  try {
    const cart = await cartService.getCart(getAuthUser(req).id)
    res.status(200).json(cart)
  } catch (error) {
    next(error)
  }
})

// POST /api/cart/items: add a product, or increase its quantity if already in the cart
router.post('/items', async (req, res, next) => {
  try {
    const payload = addItemSchema.parse(req.body)
    const cart = await cartService.addItem(getAuthUser(req).id, payload)
    res.status(200).json(cart)
  } catch (error) {
    next(error)
  }
})

// PATCH /api/cart/items/:productId: set the quantity of a product already in the cart
router.patch('/items/:productId', async (req, res, next) => {
  try {
    const productId = productIdParam.parse(req.params.productId)
    const { quantity } = setQuantitySchema.parse(req.body)
    const cart = await cartService.setItemQuantity(getAuthUser(req).id, productId, quantity)
    res.status(200).json(cart)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/cart/items/:productId: remove one product
router.delete('/items/:productId', async (req, res, next) => {
  try {
    const productId = productIdParam.parse(req.params.productId)
    const cart = await cartService.removeItem(getAuthUser(req).id, productId)
    res.status(200).json(cart)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/cart: empty the cart (e.g. after checkout)
router.delete('/', async (req, res, next) => {
  try {
    const cart = await cartService.clear(getAuthUser(req).id)
    res.status(200).json(cart)
  } catch (error) {
    next(error)
  }
})

export default router
