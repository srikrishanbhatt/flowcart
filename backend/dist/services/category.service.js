import { categoryRepository } from '../repositories/category.repository.js';
export class CategoryService {
    async listCategories() {
        return categoryRepository.listCategories();
    }
    async createCategory(input) {
        return categoryRepository.createCategory(input);
    }
}
export const categoryService = new CategoryService();
