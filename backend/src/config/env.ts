import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ quiet: true })

// Safe values have defaults; secrets and connection strings must be provided,
// so a missing .env fails at startup instead of running with a guessable secret.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgresql:// connection string'),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n')
  console.error(`Invalid environment configuration:\n${problems}\nCopy .env.example to .env and fill in the values.`)
  process.exit(1)
}

const env = parsed.data

export default env
