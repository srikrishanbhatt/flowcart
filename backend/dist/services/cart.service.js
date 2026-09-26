import { cartRepository, orderRepository } from '../repositories/cart.repository.js';
export class CartService {
    async listCartItems() {
        return cartRepository.listCartItems();
    }
    async addItemToCart(userId, input) {
        return cartRepository.addItemToCart(userId, input);
    }
}
export class OrderService {
    async listOrders() {
        return orderRepository.listOrders();
    }
    async createOrder(input) {
        return orderRepository.createOrder(input);
    }
    async updateOrderStatus(orderId, status) {
        return orderRepository.updateOrderStatus(orderId, status);
    }
}
export const cartService = new CartService();
export const orderService = new OrderService();
