import { orderRepository } from '../repositories/order.repository.js'
import type { CreateOrderInput, Order, OrderStatus } from '../types/cart.js'

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

export const orderService = new OrderService()
