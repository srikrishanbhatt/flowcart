import { productRepository } from '../repositories/product.repository.js'
import type { PaginatedResult } from '../types/pagination.js'
import type { CreateProductInput, Product, ProductListQuery } from '../types/product.js'

export class ProductService {
  async listProducts(query: ProductListQuery): Promise<PaginatedResult<Product>> {
    const { products, total } = await productRepository.listProducts(query)

    return {
      data: products,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    return productRepository.createProduct(input)
  }
}

export const productService = new ProductService()
