import { cartRepository } from '../repositories/cart.repository.js'
import type { AddCartItemInput, Cart } from '../types/cart.js'

export class CartService {
  async getCart(userId: number): Promise<Cart> {
    return cartRepository.getCart(userId)
  }

  async addItem(userId: number, input: AddCartItemInput): Promise<Cart> {
    return cartRepository.addItem(userId, input)
  }

  async setItemQuantity(userId: number, productId: number, quantity: number): Promise<Cart> {
    return cartRepository.setItemQuantity(userId, productId, quantity)
  }

  async removeItem(userId: number, productId: number): Promise<Cart> {
    return cartRepository.removeItem(userId, productId)
  }

  async clear(userId: number): Promise<Cart> {
    return cartRepository.clear(userId)
  }
}

export const cartService = new CartService()
