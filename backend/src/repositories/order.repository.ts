import { query, transaction } from '../config/database.js'
import type { CreateOrderInput, Order, OrderItem, OrderStatus } from '../types/cart.js'

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

export class OrderRepository {
  async listOrders(): Promise<Order[]> {
    const ordersResult = await query<OrderRow>(
      `SELECT id, user_id as "userId", total, status, created_at as "createdAt" FROM orders ORDER BY created_at DESC`,
    )
    const itemsResult = await query<OrderItemRow>(
      `SELECT id, order_id as "orderId", product_id as "productId", quantity, unit_price as "unitPrice", created_at as "createdAt"
       FROM order_items ORDER BY created_at DESC`,
    )

    const itemsByOrder = groupBy(itemsResult.rows.map(toOrderItem), (item) => item.orderId)

    return ordersResult.rows.map((row) => toOrder(row, itemsByOrder.get(Number(row.id)) ?? []))
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

      const orderResult = await query<OrderRow>(
        `INSERT INTO orders (user_id, total, status)
         VALUES ($1, $2, 'PENDING')
         RETURNING id, user_id as "userId", total, status, created_at as "createdAt"`,
        [input.userId, total],
      )

      const orderRow = orderResult.rows[0]
      const items: OrderItem[] = []

      for (const item of input.items) {
        const itemResult = await query<OrderItemRow>(
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
    const result = await query<OrderRow>(
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

    const itemsResult = await query<OrderItemRow>(
      `SELECT id, order_id as "orderId", product_id as "productId", quantity, unit_price as "unitPrice", created_at as "createdAt"
       FROM order_items WHERE order_id = $1`,
      [orderId],
    )

    return toOrder(result.rows[0], itemsResult.rows.map(toOrderItem))
  }
}

export const orderRepository = new OrderRepository()
