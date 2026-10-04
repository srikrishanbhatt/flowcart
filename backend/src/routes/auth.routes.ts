import { Router } from 'express'
import { z } from 'zod'
import { getAuthUser, requireAuth } from '../middleware/requireAuth.js'
import { authService } from '../services/auth.service.js'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['CUSTOMER', 'ADMIN']).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

router.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body)
    const result = await authService.register(payload)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body)
    const result = await authService.login(payload)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(getAuthUser(req).email)
    res.status(200).json(user)
  } catch (error) {
    next(error)
  }
})

export default router
