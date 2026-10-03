import app from './app.js'
import env from './config/env.js'
import { initializeDatabase } from './config/database.js'

const port = env.PORT

const startServer = async () => {
  try {
    await initializeDatabase()
    app.listen(port, () => {
      console.log(`FlowCart API running on http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  }
}

void startServer()
