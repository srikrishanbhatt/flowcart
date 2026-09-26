import { Router } from 'express'
import { z } from 'zod'
import { userService } from '../services/user.service.js'

const router = Router()

const createUserSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(8),
  role: z.enum(['CUSTOMER', 'ADMIN']).optional(),
})

router.get('/users', async (_req, res, next) => {
  try {
    const users = await userService.listUsers()
    res.status(200).json(users)
  } catch (error) {
    next(error)
  }
})

router.post('/users', async (req, res, next) => {
  try {
    const payload = createUserSchema.parse(req.body)
    const user = await userService.createUser(payload)
    res.status(201).json(user)
  } catch (error) {
    next(error)
  }
})

export default router
