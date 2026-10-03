import app from './app.js'
import env from './config/env.js'
import { findPendingMigrations, isDatabaseAvailable } from './config/database.js'

const port = env.PORT

const startServer = async () => {
  if (!(await isDatabaseAvailable())) {
    console.error('Cannot connect to the database. Check DATABASE_URL and that PostgreSQL is running.')
    process.exit(1)
  }

  const pending = await findPendingMigrations()

  if (pending.length > 0) {
    console.error(`Database schema is out of date. Pending migrations: ${pending.join(', ')}\nRun: npm run migrate`)
    process.exit(1)
  }

  app.listen(port, () => {
    console.log(`FlowCart API running on http://localhost:${port}`)
  })
}

void startServer()
