import { productRepository } from '../repositories/product.repository.js';
export class ProductService {
    async listProducts() {
        return productRepository.listProducts();
    }
    async createProduct(input) {
        return productRepository.createProduct(input);
    }
}
export const productService = new ProductService();
