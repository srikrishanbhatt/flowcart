import { query } from '../config/database.js'
import type { AddCartItemInput, Cart } from '../types/cart.js'

type CartItemRow = {
  productId: number | string
  quantity: number | string
}

const notFound = (message: string) => Object.assign(new Error(message), { statusCode: 404 })

// Every query is scoped by user_id, which comes from the verified token (req.user),
// so one user can never read or change another user's cart.
export class CartRepository {
  async getCart(userId: number): Promise<Cart> {
    const result = await query<CartItemRow>(
      `SELECT ci.product_id AS "productId", ci.quantity
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       WHERE c.user_id = $1
       ORDER BY ci.created_at, ci.id`,
      [userId],
    )

    return {
      userId,
      items: result.rows.map((row) => ({ productId: Number(row.productId), quantity: Number(row.quantity) })),
    }
  }

  async addItem(userId: number, input: AddCartItemInput): Promise<Cart> {
    // Upserts instead of "SELECT, then INSERT if missing": two concurrent requests could both
    // see "missing" and both insert. ON CONFLICT lets the UNIQUE constraint decide atomically.
    // The no-op DO UPDATE makes RETURNING give back the existing row's id on conflict
    // (DO NOTHING would return no row).
    const cartResult = await query<{ id: number }>(
      `INSERT INTO carts (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING id`,
      [userId],
    )

    // INSERT ... SELECT only inserts if the product exists and is active, in the same statement.
    // Adding a product that's already in the cart increases its quantity.
    const itemResult = await query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       SELECT $1, id, $3 FROM products WHERE id = $2 AND is_active = true
       ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
       RETURNING product_id`,
      [cartResult.rows[0].id, input.productId, input.quantity],
    )

    if (itemResult.rowCount === 0) {
      throw notFound(`Product ${input.productId} not found`)
    }

    return this.getCart(userId)
  }

  async setItemQuantity(userId: number, productId: number, quantity: number): Promise<Cart> {
    const result = await query(
      `UPDATE cart_items ci SET quantity = $3
       FROM carts c
       WHERE c.id = ci.cart_id AND c.user_id = $1 AND ci.product_id = $2`,
      [userId, productId, quantity],
    )

    if (result.rowCount === 0) {
      throw notFound(`Product ${productId} is not in the cart`)
    }

    return this.getCart(userId)
  }

  // Removing something that isn't there still succeeds: DELETE is idempotent, so a retried
  // request (e.g. after a network blip) gives the same result instead of an error.
  async removeItem(userId: number, productId: number): Promise<Cart> {
    await query(
      `DELETE FROM cart_items ci USING carts c
       WHERE c.id = ci.cart_id AND c.user_id = $1 AND ci.product_id = $2`,
      [userId, productId],
    )

    return this.getCart(userId)
  }

  async clear(userId: number): Promise<Cart> {
    await query(
      `DELETE FROM cart_items ci USING carts c
       WHERE c.id = ci.cart_id AND c.user_id = $1`,
      [userId],
    )

    return this.getCart(userId)
  }
}

export const cartRepository = new CartRepository()
