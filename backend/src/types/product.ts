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
