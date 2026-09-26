import { productRepository } from '../repositories/product.repository.js'
import type { CreateProductInput, Product } from '../types/product.js'

export class ProductService {
  async listProducts(): Promise<Product[]> {
    return productRepository.listProducts()
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    return productRepository.createProduct(input)
  }
}

export const productService = new ProductService()
