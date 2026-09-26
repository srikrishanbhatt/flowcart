import { categoryRepository } from '../repositories/category.repository.js'
import type { Category, CreateCategoryInput } from '../types/category.js'

export class CategoryService {
  async listCategories(): Promise<Category[]> {
    return categoryRepository.listCategories()
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    return categoryRepository.createCategory(input)
  }
}

export const categoryService = new CategoryService()
