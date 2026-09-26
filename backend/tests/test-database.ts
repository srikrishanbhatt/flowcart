import dotenv from 'dotenv'

dotenv.config()

const TEST_DATABASE_NAME = 'flowcart_test'

// Tests run against a dedicated database so they never touch development data.
// Override with TEST_DATABASE_URL; otherwise reuse the dev connection with the test database name.
export const resolveTestDatabaseUrl = () => {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL
  }

  const devUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:root@localhost:5432/flowcart'
  const url = new URL(devUrl)
  url.pathname = `/${TEST_DATABASE_NAME}`
  return url.toString()
}
