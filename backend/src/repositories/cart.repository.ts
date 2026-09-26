import { getDatabasePool, initializeDatabase, isDatabaseInitialized } from '../config/database.js'
import { productRepository } from './product.repository.js'
import type { Cart, CartItem, CreateCartItemInput, CreateOrderInput, Order, OrderItem, OrderStatus } from '../types/cart.js'

const getReadyDatabasePool = async () => {
  let databasePool = getDatabasePool()

  if (!databasePool || !isDatabaseInitialized(databasePool)) {
    await initializeDatabase()
    databasePool = getDatabasePool()
  }

  return databasePool
}

const inMemoryCarts: Cart[] = []
const inMemoryOrders: Order[] = []

type CartRow = {
  id: number | string
  userId: number | string
  createdAt: string
}

type CartItemRow = {
  id: number | string
  cartId: number | string
  productId: number | string
  quantity: number | string
  createdAt: string
}

type OrderRow = {
  id: number | string
  userId: number | string
  total: number | string
  status: string
  createdAt: string
}

type OrderItemRow = {
  id: number | string
  orderId: number | string
  productId: number | string
  quantity: number | string
  unitPrice: number | string
  createdAt: string
}

const insufficientStockError = (productId: number, requested: number, available?: number) =>
  Object.assign(
    new Error(
      available === undefined
        ? `Insufficient stock for product ${productId}. Requested ${requested}.`
        : `Insufficient stock for product ${productId}. Requested ${requested}, available ${available}.`,
    ),
    { statusCode: 400 },
  )

export class CartRepository {
  async listCartItems(): Promise<Cart[]> {
    const databasePool = await getReadyDatabasePool()

    if (!databasePool) {
      return inMemoryCarts
    }

    const cartsResult = await databasePool.query(
      `SELECT id, user_id as "userId", created_at as "createdAt" FROM carts ORDER BY created_at DESC`,
    )

    const cartRows: CartRow[] = cartsResult.rows
    const itemsResult = await databasePool.query(
      `SELECT id, cart_id as "cartId", product_id as "productId", quantity, created_at as "createdAt" FROM cart_items ORDER BY created_at DESC`,
    )

    const itemsByCart = new Map<number, CartItem[]>()

    for (const itemRow of itemsResult.rows as CartItemRow[]) {
      const cartId = Number(itemRow.cartId)
      const item: CartItem = {
        id: Number(itemRow.id),
        cartId,
        productId: Number(itemRow.productId),
        quantity: Number(itemRow.quantity),
        createdAt: new Date(itemRow.createdAt).toISOString(),
      }

      const existing = itemsByCart.get(cartId) ?? []
      const index = existing.findIndex((entry) => entry.productId === item.productId)

      if (index >= 0) {
        existing[index] = {
          ...existing[index],
          quantity: existing[index].quantity + item.quantity,
          createdAt: existing[index].createdAt,
        }
      } else {
        existing.push(item)
      }

      itemsByCart.set(cartId, existing)
    }

    return cartRows.map((row) => ({
      id: Number(row.id),
      userId: Number(row.userId),
      items: itemsByCart.get(Number(row.id)) ?? [],
      createdAt: new Date(row.createdAt).toISOString(),
    }))
  }

  async addItemToCart(userId: number, input: CreateCartItemInput): Promise<Cart> {
    const databasePool = await getReadyDatabasePool()

    if (!databasePool) {
      const existingCart = inMemoryCarts.find((cart) => cart.userId === userId)
      const cart = existingCart ?? {
        id: inMemoryCarts.length + 1,
        userId,
        items: [],
        createdAt: new Date().toISOString(),
      }

      const existingItem = cart.items.find((item) => item.productId === input.productId)
      const quantity = input.quantity ?? 1

      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        cart.items.push({
          id: cart.items.length + 1,
          cartId: cart.id,
          productId: input.productId,
          quantity,
          createdAt: new Date().toISOString(),
        })
      }

      if (!existingCart) {
        inMemoryCarts.push(cart)
      }

      return cart
    }

    let cartResult = await databasePool.query(
      `SELECT id FROM carts WHERE user_id = $1 LIMIT 1`,
      [userId],
    )

    if (cartResult.rowCount === 0) {
      cartResult = await databasePool.query(
        `INSERT INTO carts (user_id) VALUES ($1) RETURNING id`,
        [userId],
      )
    }

    const cartId = Number(cartResult.rows[0].id)
    const quantityToAdd = input.quantity ?? 1

    const existingItemResult = await databasePool.query(
      `SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 LIMIT 1`,
      [cartId, input.productId],
    )

    if (existingItemResult.rowCount > 0) {
      await databasePool.query(
        `UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2`,
        [quantityToAdd, existingItemResult.rows[0].id],
      )
    } else {
      await databasePool.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)`,
        [cartId, input.productId, quantityToAdd],
      )
    }

    const updatedCart = await databasePool.query(
      `SELECT id, user_id as "userId", created_at as "createdAt" FROM carts WHERE id = $1`,
      [cartId],
    )

    const itemRows = await databasePool.query(
      `SELECT id, cart_id as "cartId", product_id as "productId", quantity, created_at as "createdAt" FROM cart_items WHERE cart_id = $1 ORDER BY created_at DESC`,
      [cartId],
    )

    const cartRow = updatedCart.rows[0] as CartRow

    return {
      id: Number(cartRow.id),
      userId: Number(cartRow.userId),
      items: (itemRows.rows as CartItemRow[]).map((row) => ({
        id: Number(row.id),
        cartId: Number(row.cartId),
        productId: Number(row.productId),
        quantity: Number(row.quantity),
        createdAt: new Date(row.createdAt).toISOString(),
      })),
      createdAt: new Date(cartRow.createdAt).toISOString(),
    }
  }
}

export class OrderRepository {
  async listOrders(): Promise<Order[]> {
    const databasePool = await getReadyDatabasePool()

    if (!databasePool) {
      return inMemoryOrders
    }

    const ordersResult = await databasePool.query(
      `SELECT id, user_id as "userId", total, status, created_at as "createdAt" FROM orders ORDER BY created_at DESC`,
    )

    const orderRows: OrderRow[] = ordersResult.rows
    const itemsResult = await databasePool.query(
      `SELECT id, order_id as "orderId", product_id as "productId", quantity, unit_price as "unitPrice", created_at as "createdAt" FROM order_items ORDER BY created_at DESC`,
    )

    const itemsByOrder = new Map<number, OrderItem[]>()

    for (const itemRow of itemsResult.rows as OrderItemRow[]) {
      const orderId = Number(itemRow.orderId)
      const item: OrderItem = {
        id: Number(itemRow.id),
        orderId,
        productId: Number(itemRow.productId),
        quantity: Number(itemRow.quantity),
        unitPrice: Number(itemRow.unitPrice),
        createdAt: new Date(itemRow.createdAt).toISOString(),
      }

      const existing = itemsByOrder.get(orderId) ?? []
      existing.push(item)
      itemsByOrder.set(orderId, existing)
    }

    return orderRows.map((row) => ({
      id: Number(row.id),
      userId: Number(row.userId),
      total: Number(row.total),
      status: row.status as Order['status'],
      items: itemsByOrder.get(Number(row.id)) ?? [],
      createdAt: new Date(row.createdAt).toISOString(),
    }))
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const databasePool = await getReadyDatabasePool()

    if (!databasePool) {
      const products = await productRepository.listProducts()
      const productMap = new Map(products.map((product) => [product.id, product]))

      for (const item of input.items) {
        const product = productMap.get(item.productId)

        if (!product) {
          throw Object.assign(new Error(`Product ${item.productId} not found`), {
            statusCode: 404,
          })
        }

        if (item.quantity > product.stock) {
          throw Object.assign(
            new Error(
              `Insufficient stock for product ${item.productId}. Requested ${item.quantity}, available ${product.stock}.`,
            ),
            { statusCode: 400 },
          )
        }
      }

      for (const item of input.items) {
        const product = productMap.get(item.productId)
        if (product) {
          product.stock -= item.quantity
        }
      }

      const order: Order = {
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
      }

      inMemoryOrders.push(order)
      return order
    }

    const total = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

    // Stock check, order insert and stock decrement succeed or fail together.
    const { orderRow, orderId } = await databasePool.transaction(async (query) => {
      const productIds = [...new Set(input.items.map((item) => item.productId))]
      const placeholders = productIds.map((_, index) => `$${index + 1}`).join(', ')
      const productResult = await query(
        `SELECT id, stock FROM products WHERE id IN (${placeholders})`,
        productIds,
      )

      const productStockMap = new Map<number, number>(
        productResult.rows.map((row) => [Number(row.id), Number(row.stock)]),
      )

      for (const item of input.items) {
        const availableStock = productStockMap.get(item.productId)

        if (availableStock === undefined) {
          throw Object.assign(new Error(`Product ${item.productId} not found`), {
            statusCode: 404,
          })
        }

        if (item.quantity > availableStock) {
          throw insufficientStockError(item.productId, item.quantity, availableStock)
        }
      }

      const orderResult = await query(
        `INSERT INTO orders (user_id, total, status)
         VALUES ($1, $2, 'PENDING')
         RETURNING id, user_id as "userId", total, status, created_at as "createdAt"`,
        [input.userId, total],
      )

      const orderRow: OrderRow = orderResult.rows[0]
      const orderId = Number(orderRow.id)

      for (const item of input.items) {
        await query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [orderId, item.productId, item.quantity, item.unitPrice],
        )

        // The stock guard stops a concurrent order from taking the same units between
        // the check above and this update.
        const stockUpdate = await query(
          `UPDATE products
           SET stock = stock - $1
           WHERE id = $2 AND stock >= $1`,
          [item.quantity, item.productId],
        )

        if (stockUpdate.rowCount === 0) {
          throw insufficientStockError(item.productId, item.quantity)
        }
      }

      return { orderRow, orderId }
    })

    return {
      id: orderId,
      userId: Number(orderRow.userId),
      total: Number(orderRow.total),
      status: orderRow.status as Order['status'],
      items: input.items.map((item, index) => ({
        id: index + 1,
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        createdAt: new Date().toISOString(),
      })),
      createdAt: new Date(orderRow.createdAt).toISOString(),
    }
  }

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    const databasePool = await getReadyDatabasePool()

    if (!databasePool) {
      const order = inMemoryOrders.find((item) => item.id === orderId)

      if (!order) {
        throw Object.assign(new Error(`Order ${orderId} not found`), {
          statusCode: 404,
        })
      }

      order.status = status
      return order
    }

    const result = await databasePool.query(
      `UPDATE orders
       SET status = $1
       WHERE id = $2
       RETURNING id, user_id as "userId", total, status, created_at as "createdAt"`,
      [status, orderId],
    )

    if (result.rowCount === 0) {
      throw Object.assign(new Error(`Order ${orderId} not found`), {
        statusCode: 404,
      })
    }

    const row: OrderRow = result.rows[0]
    const itemsResult = await databasePool.query(
      `SELECT id, order_id as "orderId", product_id as "productId", quantity, unit_price as "unitPrice", created_at as "createdAt"
       FROM order_items WHERE order_id = $1`,
      [orderId],
    )

    return {
      id: Number(row.id),
      userId: Number(row.userId),
      total: Number(row.total),
      status: row.status as Order['status'],
      items: itemsResult.rows.map((item: OrderItemRow, index: number) => ({
        id: Number(item.id) || index + 1,
        orderId: Number(item.orderId),
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        createdAt: new Date(item.createdAt).toISOString(),
      })),
      createdAt: new Date(row.createdAt).toISOString(),
    }
  }
}

export const cartRepository = new CartRepository()
export const orderRepository = new OrderRepository()
