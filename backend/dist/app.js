import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import productRoutes from './routes/product.routes.js';
import categoryRoutes from './routes/category.routes.js';
import userRoutes from './routes/user.routes.js';
import cartRoutes from './routes/cart.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundMiddleware } from './middleware/notFound.js';
const app = express();
app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
}));
app.use(express.json());
app.get('/', (_req, res) => {
    res.json({
        success: true,
        message: 'FlowCart API is running',
    });
});
app.use('/api', healthRoutes);
app.use('/api', productRoutes);
app.use('/api', categoryRoutes);
app.use('/api', userRoutes);
app.use('/api', cartRoutes);
app.use(notFoundMiddleware);
app.use(errorHandler);
export default app;
