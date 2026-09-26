import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('postgresql://postgres:root@localhost:5432/flowcart'),
  DB_CLIENT: z.enum(['postgres', 'sqlite']).default('postgres'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('flowcart'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('root'),
  JWT_SECRET: z.string().default('flowcart-dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),
})

const env = envSchema.parse(process.env)

export default env
