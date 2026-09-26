import { getDatabasePool } from '../config/database.js';
import { productRepository } from './product.repository.js';
const inMemoryCarts = [];
const inMemoryOrders = [];
export class CartRepository {
    async listCartItems() {
        const databasePool = getDatabasePool();
        if (!databasePool) {
            return inMemoryCarts;
        }
        const cartsResult = await databasePool.query(`SELECT id, user_id as "userId", created_at as "createdAt" FROM carts ORDER BY created_at DESC`);
        const cartRows = cartsResult.rows;
        const itemsResult = await databasePool.query(`SELECT id, cart_id as "cartId", product_id as "productId", quantity, created_at as "createdAt" FROM cart_items ORDER BY created_at DESC`);
        const itemsByCart = new Map();
        for (const itemRow of itemsResult.rows) {
            const cartId = Number(itemRow.cartId);
            const item = {
                id: Number(itemRow.id),
                cartId,
                productId: Number(itemRow.productId),
                quantity: Number(itemRow.quantity),
                createdAt: new Date(itemRow.createdAt).toISOString(),
            };
            const existing = itemsByCart.get(cartId) ?? [];
            existing.push(item);
            itemsByCart.set(cartId, existing);
        }
        return cartRows.map((row) => ({
            id: Number(row.id),
            userId: Number(row.userId),
            items: itemsByCart.get(Number(row.id)) ?? [],
            createdAt: new Date(row.createdAt).toISOString(),
        }));
    }
    async addItemToCart(userId, input) {
        const databasePool = getDatabasePool();
        if (!databasePool) {
            const existingCart = inMemoryCarts.find((cart) => cart.userId === userId);
            const cart = existingCart ?? {
                id: inMemoryCarts.length + 1,
                userId,
                items: [],
                createdAt: new Date().toISOString(),
            };
            const item = {
                id: cart.items.length + 1,
                cartId: cart.id,
                productId: input.productId,
                quantity: input.quantity ?? 1,
                createdAt: new Date().toISOString(),
            };
            cart.items.push(item);
            if (!existingCart) {
                inMemoryCarts.push(cart);
            }
            return cart;
        }
        let cartResult = await databasePool.query(`SELECT id FROM carts WHERE user_id = $1 LIMIT 1`, [userId]);
        if (cartResult.rowCount === 0) {
            cartResult = await databasePool.query(`INSERT INTO carts (user_id) VALUES ($1) RETURNING id`, [userId]);
        }
        const cartId = Number(cartResult.rows[0].id);
        await databasePool.query(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)`, [cartId, input.productId, input.quantity ?? 1]);
        const updatedCart = await databasePool.query(`SELECT id, user_id as "userId", created_at as "createdAt" FROM carts WHERE id = $1`, [cartId]);
        const cartRows = updatedCart.rows;
        const cart = cartRows[0];
        return {
            id: Number(cart.id),
            userId: Number(cart.userId),
            items: [],
            createdAt: new Date(cart.createdAt).toISOString(),
        };
    }
}
export class OrderRepository {
    async listOrders() {
        const databasePool = getDatabasePool();
        if (!databasePool) {
            return inMemoryOrders;
        }
        const ordersResult = await databasePool.query(`SELECT id, user_id as "userId", total, status, created_at as "createdAt" FROM orders ORDER BY created_at DESC`);
        const orderRows = ordersResult.rows;
        const itemsResult = await databasePool.query(`SELECT id, order_id as "orderId", product_id as "productId", quantity, unit_price as "unitPrice", created_at as "createdAt" FROM order_items ORDER BY created_at DESC`);
        const itemsByOrder = new Map();
        for (const itemRow of itemsResult.rows) {
            const orderId = Number(itemRow.orderId);
            const item = {
                id: Number(itemRow.id),
                orderId,
                productId: Number(itemRow.productId),
                quantity: Number(itemRow.quantity),
                unitPrice: Number(itemRow.unitPrice),
                createdAt: new Date(itemRow.createdAt).toISOString(),
            };
            const existing = itemsByOrder.get(orderId) ?? [];
            existing.push(item);
            itemsByOrder.set(orderId, existing);
        }
        return orderRows.map((row) => ({
            id: Number(row.id),
            userId: Number(row.userId),
            total: Number(row.total),
            status: row.status,
            items: itemsByOrder.get(Number(row.id)) ?? [],
            createdAt: new Date(row.createdAt).toISOString(),
        }));
    }
    async createOrder(input) {
        const databasePool = getDatabasePool();
        if (!databasePool) {
            const products = await productRepository.listProducts();
            const productMap = new Map(products.map((product) => [product.id, product]));
            for (const item of input.items) {
                const product = productMap.get(item.productId);
                if (!product) {
                    throw Object.assign(new Error(`Product ${item.productId} not found`), {
                        statusCode: 404,
                    });
                }
                if (item.quantity > product.stock) {
                    throw Object.assign(new Error(`Insufficient stock for product ${item.productId}. Requested ${item.quantity}, available ${product.stock}.`), { statusCode: 400 });
                }
            }
            for (const item of input.items) {
                const product = productMap.get(item.productId);
                if (product) {
                    product.stock -= item.quantity;
                }
            }
            const order = {
                id: inMemoryOrders.length + 1,
                userId: input.userId,
                total: input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
                status: 'PENDING',
                items: input.items.map((item, index) => ({
                    id: index + 1,
                    orderId: inMemoryOrders.length + 1,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    createdAt: new Date().toISOString(),
                })),
                createdAt: new Date().toISOString(),
            };
            inMemoryOrders.push(order);
            return order;
        }
        const productIds = [...new Set(input.items.map((item) => item.productId))];
        const productResult = await databasePool.query(`SELECT id, stock FROM products WHERE id = ANY($1)`, [productIds]);
        const productStockMap = new Map(productResult.rows.map((row) => [Number(row.id), Number(row.stock)]));
        for (const item of input.items) {
            const availableStock = productStockMap.get(item.productId);
            if (availableStock === undefined) {
                throw Object.assign(new Error(`Product ${item.productId} not found`), {
                    statusCode: 404,
                });
            }
            if (item.quantity > availableStock) {
                throw Object.assign(new Error(`Insufficient stock for product ${item.productId}. Requested ${item.quantity}, available ${availableStock}.`), { statusCode: 400 });
            }
        }
        const total = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const orderResult = await databasePool.query(`INSERT INTO orders (user_id, total, status)
       VALUES ($1, $2, 'PENDING')
       RETURNING id, user_id as "userId", total, status, created_at as "createdAt"`, [input.userId, total]);
        const orderRow = orderResult.rows[0];
        const orderId = Number(orderRow.id);
        for (const item of input.items) {
            await databasePool.query(`INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`, [orderId, item.productId, item.quantity, item.unitPrice]);
            await databasePool.query(`UPDATE products
         SET stock = stock - $1
         WHERE id = $2`, [item.quantity, item.productId]);
        }
        return {
            id: orderId,
            userId: Number(orderRow.userId),
            total: Number(orderRow.total),
            status: orderRow.status,
            items: input.items.map((item, index) => ({
                id: index + 1,
                orderId,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                createdAt: new Date().toISOString(),
            })),
            createdAt: new Date(orderRow.createdAt).toISOString(),
        };
    }
    async updateOrderStatus(orderId, status) {
        const databasePool = getDatabasePool();
        if (!databasePool) {
            const order = inMemoryOrders.find((item) => item.id === orderId);
            if (!order) {
                throw Object.assign(new Error(`Order ${orderId} not found`), {
                    statusCode: 404,
                });
            }
            order.status = status;
            return order;
        }
        const result = await databasePool.query(`UPDATE orders
       SET status = $1
       WHERE id = $2
       RETURNING id, user_id as "userId", total, status, created_at as "createdAt"`, [status, orderId]);
        if (result.rowCount === 0) {
            throw Object.assign(new Error(`Order ${orderId} not found`), {
                statusCode: 404,
            });
        }
        const row = result.rows[0];
        const itemsResult = await databasePool.query(`SELECT id, order_id as "orderId", product_id as "productId", quantity, unit_price as "unitPrice", created_at as "createdAt"
       FROM order_items WHERE order_id = $1`, [orderId]);
        return {
            id: Number(row.id),
            userId: Number(row.userId),
            total: Number(row.total),
            status: row.status,
            items: itemsResult.rows.map((item, index) => ({
                id: Number(item.id) || index + 1,
                orderId: Number(item.orderId),
                productId: Number(item.productId),
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                createdAt: new Date(item.createdAt).toISOString(),
            })),
            createdAt: new Date(row.createdAt).toISOString(),
        };
    }
}
export const cartRepository = new CartRepository();
export const orderRepository = new OrderRepository();
