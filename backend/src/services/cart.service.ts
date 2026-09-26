import { cartRepository, orderRepository } from '../repositories/cart.repository.js'
import type { Cart, CreateCartItemInput, CreateOrderInput, Order, OrderStatus } from '../types/cart.js'

export class CartService {
  async listCartItems(): Promise<Cart[]> {
    return cartRepository.listCartItems()
  }

  async addItemToCart(userId: number, input: CreateCartItemInput): Promise<Cart> {
    return cartRepository.addItemToCart(userId, input)
  }
}

export class OrderService {
  async listOrders(): Promise<Order[]> {
    return orderRepository.listOrders()
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    return orderRepository.createOrder(input)
  }

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    return orderRepository.updateOrderStatus(orderId, status)
  }
}

export const cartService = new CartService()
export const orderService = new OrderService()
