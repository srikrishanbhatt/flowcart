import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    FRONTEND_URL: z.string().default('http://localhost:5173'),
    DATABASE_URL: z.string().optional(),
});
const env = envSchema.parse(process.env);
export default env;
