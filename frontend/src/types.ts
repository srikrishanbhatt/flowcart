export type Product = {
  id: number
  name: string
  description: string
  price: number
  stock: number
  categoryId?: number | null
  isActive?: boolean
}

export type Category = {
  id: number
  name: string
  slug: string
}

export type CartItem = {
  productId: number
  quantity: number
}

export type UserSession = {
  id: number
  email: string
  role: string
  createdAt: string
}

export type AuthMode = 'login' | 'register'

export type AuthForm = {
  email: string
  password: string
  role: string
}
