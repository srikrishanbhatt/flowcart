import express from 'express'
import cors from 'cors'
import env from './config/env.js'
import healthRoutes from './routes/health.routes.js'
import productRoutes from './routes/product.routes.js'
import categoryRoutes from './routes/category.routes.js'
import userRoutes from './routes/user.routes.js'
import authRoutes from './routes/auth.routes.js'
import cartRoutes from './routes/cart.routes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundMiddleware } from './middleware/notFound.js'

const app = express()
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('CORS policy: origin not allowed'))
    },
    credentials: true,
  }),
)
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'FlowCart API is running',
  })
})

app.use('/api', healthRoutes)
app.use('/api', productRoutes)
app.use('/api', categoryRoutes)
app.use('/api', userRoutes)
app.use('/api/auth', authRoutes)
app.use('/api', cartRoutes)

app.use(notFoundMiddleware)
app.use(errorHandler)

export default app
