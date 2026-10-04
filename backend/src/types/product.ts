export type Product = {
  id: number
  name: string
  slug: string
  description: string
  price: number
  stock: number
  categoryId: number | null
  isActive: boolean
  createdAt: string
}

export type CreateProductInput = {
  name: string
  description?: string
  price: number
  stock?: number
  categoryId?: number | null
  isActive?: boolean
}

export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'name_asc'] as const
export type ProductSort = (typeof PRODUCT_SORTS)[number]

export type ProductListQuery = {
  page: number
  limit: number
  category?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  sort: ProductSort
}
