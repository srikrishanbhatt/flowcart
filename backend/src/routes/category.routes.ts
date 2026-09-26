import { Router } from 'express'
import { z } from 'zod'
import { categoryService } from '../services/category.service.js'

const router = Router()

const createCategorySchema = z.object({
  name: z.string().min(2),
})

router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await categoryService.listCategories()
    res.status(200).json(categories)
  } catch (error) {
    next(error)
  }
})

router.post('/categories', async (req, res, next) => {
  try {
    const payload = createCategorySchema.parse(req.body)
    const category = await categoryService.createCategory(payload)
    res.status(201).json(category)
  } catch (error) {
    next(error)
  }
})

export default router
