import { Router } from 'express';
import { isDatabaseAvailable } from '../config/database.js';
const router = Router();
router.get('/health', async (_req, res) => {
    const databaseReady = await isDatabaseAvailable();
    res.status(200).json({
        success: true,
        status: 'ok',
        service: 'flowcart-api',
        database: databaseReady ? 'connected' : 'not-configured',
        timestamp: new Date().toISOString(),
    });
});
export default router;
