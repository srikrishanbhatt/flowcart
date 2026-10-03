import { query, transaction } from '../config/database.js'
import type { Cart, CartItem, CreateCartItemInput, CreateOrderInput, Order, OrderItem, OrderStatus } from '../types/cart.js'

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

const toCartItem = (row: CartItemRow): CartItem => ({
  id: Number(row.id),
  cartId: Number(row.cartId),
  productId: Number(row.productId),
  quantity: Number(row.quantity),
  createdAt: new Date(row.createdAt).toISOString(),
})

const toOrderItem = (row: OrderItemRow): OrderItem => ({
  id: Number(row.id),
  orderId: Number(row.orderId),
  productId: Number(row.productId),
  quantity: Number(row.quantity),
  unitPrice: Number(row.unitPrice),
  createdAt: new Date(row.createdAt).toISOString(),
})

const toOrder = (row: OrderRow, items: OrderItem[]): Order => ({
  id: Number(row.id),
  userId: Number(row.userId),
  total: Number(row.total),
  status: row.status as OrderStatus,
  items,
  createdAt: new Date(row.createdAt).toISOString(),
})

const groupBy = <T>(items: T[], key: (item: T) => number) => {
  const groups = new Map<number, T[]>()

  for (const item of items) {
    const group = groups.get(key(item)) ?? []
    group.push(item)
    groups.set(key(item), group)
  }

  return groups
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
    const cartsResult = await query(
      `SELECT id, user_id as "userId", created_at as "createdAt" FROM carts ORDER BY created_at DESC`,
    )
    const itemsResult = await query(
      `SELECT id, cart_id as "cartId", product_id as "productId", quantity, created_at as "createdAt"
       FROM cart_items ORDER BY created_at DESC`,
    )

    const itemsByCart = groupBy(itemsResult.rows.map(toCartItem), (item) => item.cartId)

    return (cartsResult.rows as CartRow[]).map((row) => ({
      id: Number(row.id),
      userId: Number(row.userId),
      items: itemsByCart.get(Number(row.id)) ?? [],
      createdAt: new Date(row.createdAt).toISOString(),
    }))
  }

  async addItemToCart(userId: number, input: CreateCartItemInput): Promise<Cart> {
    let cartResult = await query(`SELECT id FROM carts WHERE user_id = $1 LIMIT 1`, [userId])

    if (cartResult.rowCount === 0) {
      cartResult = await query(`INSERT INTO carts (user_id) VALUES ($1) RETURNING id`, [userId])
    }

    const cartId = Number(cartResult.rows[0].id)
    const quantityToAdd = input.quantity ?? 1

    const existingItemResult = await query(
      `SELECT id FROM cart_items WHERE cart_id = $1 AND product_id = $2 LIMIT 1`,
      [cartId, input.productId],
    )

    if (existingItemResult.rowCount > 0) {
      await query(`UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2`, [
        quantityToAdd,
        existingItemResult.rows[0].id,
      ])
    } else {
      await query(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)`, [
        cartId,
        input.productId,
        quantityToAdd,
      ])
    }

    const cartRowResult = await query(
      `SELECT id, user_id as "userId", created_at as "createdAt" FROM carts WHERE id = $1`,
      [cartId],
    )
    const itemsResult = await query(
      `SELECT id, cart_id as "cartId", product_id as "productId", quantity, created_at as "createdAt"
       FROM cart_items WHERE cart_id = $1 ORDER BY created_at DESC`,
      [cartId],
    )

    const cartRow = cartRowResult.rows[0] as CartRow

    return {
      id: Number(cartRow.id),
      userId: Number(cartRow.userId),
      items: itemsResult.rows.map(toCartItem),
      createdAt: new Date(cartRow.createdAt).toISOString(),
    }
  }
}

export class OrderRepository {
  async listOrders(): Promise<Order[]> {
    const ordersResult = await query(
      `SELECT id, user_id as "userId", total, status, created_at as "createdAt" FROM orders ORDER BY created_at DESC`,
    )
    const itemsResult = await query(
      `SELECT id, order_id as "orderId", product_id as "productId", quantity, unit_price as "unitPrice", created_at as "createdAt"
       FROM order_items ORDER BY created_at DESC`,
    )

    const itemsByOrder = groupBy(itemsResult.rows.map(toOrderItem), (item) => item.orderId)

    return (ordersResult.rows as OrderRow[]).map((row) => toOrder(row, itemsByOrder.get(Number(row.id)) ?? []))
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const total = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

    // Stock check, order insert and stock decrement succeed or fail together.
    return transaction(async (query) => {
      const productIds = [...new Set(input.items.map((item) => item.productId))]
      const placeholders = productIds.map((_, index) => `$${index + 1}`).join(', ')
      const productResult = await query(`SELECT id, stock FROM products WHERE id IN (${placeholders})`, productIds)

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
      const items: OrderItem[] = []

      for (const item of input.items) {
        const itemResult = await query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)
           RETURNING id, order_id as "orderId", product_id as "productId", quantity, unit_price as "unitPrice", created_at as "createdAt"`,
          [orderRow.id, item.productId, item.quantity, item.unitPrice],
        )
        items.push(toOrderItem(itemResult.rows[0]))

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

      return toOrder(orderRow, items)
    })
  }

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    const result = await query(
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

    const itemsResult = await query(
      `SELECT id, order_id as "orderId", product_id as "productId", quantity, unit_price as "unitPrice", created_at as "createdAt"
       FROM order_items WHERE order_id = $1`,
      [orderId],
    )

    return toOrder(result.rows[0], itemsResult.rows.map(toOrderItem))
  }
}

export const cartRepository = new CartRepository()
export const orderRepository = new OrderRepository()
