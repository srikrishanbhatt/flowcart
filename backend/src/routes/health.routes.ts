import { Router } from 'express'
import { isDatabaseAvailable } from '../config/database.js'

const router = Router()

// 503 when the database is unreachable, so load balancers and orchestrators
// stop routing traffic to an instance that can't serve requests.
router.get('/health', async (_req, res) => {
  const databaseReady = await isDatabaseAvailable()

  res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    status: databaseReady ? 'ok' : 'degraded',
    service: 'flowcart-api',
    database: databaseReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})

export default router
