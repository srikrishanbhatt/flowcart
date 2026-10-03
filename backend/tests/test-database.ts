import dotenv from 'dotenv'

dotenv.config()

const TEST_DATABASE_NAME = 'flowcart_test'

// Tests run against a dedicated database so they never touch development data.
// Override with TEST_DATABASE_URL; otherwise reuse the dev connection with the test database name.
export const resolveTestDatabaseUrl = () => {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('Set TEST_DATABASE_URL or DATABASE_URL (see .env.example) to run the tests')
  }

  const url = new URL(process.env.DATABASE_URL)
  url.pathname = `/${TEST_DATABASE_NAME}`
  return url.toString()
}
