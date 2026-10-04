export type CartItem = {
  productId: number
  quantity: number
}

// Each user has at most one cart, so the API exposes it by user, not by cart id.
export type Cart = {
  userId: number
  items: CartItem[]
}

export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export type OrderItem = {
  id: number
  orderId: number
  productId: number
  quantity: number
  unitPrice: number
  createdAt: string
}

export type Order = {
  id: number
  userId: number
  total: number
  status: OrderStatus
  items: OrderItem[]
  createdAt: string
}

export type AddCartItemInput = {
  productId: number
  quantity: number
}

export type CreateOrderInput = {
  userId: number
  items: Array<{
    productId: number
    quantity: number
    unitPrice: number
  }>
}
