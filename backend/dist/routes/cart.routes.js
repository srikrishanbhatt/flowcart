import { Router } from 'express';
import { z } from 'zod';
import { cartService, orderService } from '../services/cart.service.js';
const router = Router();
const addToCartSchema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive().optional(),
});
const createOrderSchema = z.object({
    userId: z.number().int().positive(),
    items: z.array(z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
    })),
});
const updateOrderStatusSchema = z.object({
    status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});
router.get('/cart', async (_req, res, next) => {
    try {
        const cart = await cartService.listCartItems();
        res.status(200).json(cart);
    }
    catch (error) {
        next(error);
    }
});
router.post('/cart/:userId', async (req, res, next) => {
    try {
        const payload = addToCartSchema.parse(req.body);
        const cart = await cartService.addItemToCart(Number(req.params.userId), payload);
        res.status(201).json(cart);
    }
    catch (error) {
        next(error);
    }
});
router.get('/orders', async (_req, res, next) => {
    try {
        const orders = await orderService.listOrders();
        res.status(200).json(orders);
    }
    catch (error) {
        next(error);
    }
});
router.post('/orders', async (req, res, next) => {
    try {
        const payload = createOrderSchema.parse(req.body);
        const order = await orderService.createOrder(payload);
        res.status(201).json(order);
    }
    catch (error) {
        next(error);
    }
});
router.patch('/orders/:id/status', async (req, res, next) => {
    try {
        const payload = updateOrderStatusSchema.parse(req.body);
        const order = await orderService.updateOrderStatus(Number(req.params.id), payload.status);
        res.status(200).json(order);
    }
    catch (error) {
        next(error);
    }
});
export default router;
