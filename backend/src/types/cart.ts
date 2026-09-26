export type CartItem = {
  id: number
  cartId: number
  productId: number
  quantity: number
  createdAt: string
}

export type Cart = {
  id: number
  userId: number
  items: CartItem[]
  createdAt: string
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

export type CreateCartItemInput = {
  productId: number
  quantity?: number
}

export type CreateOrderInput = {
  userId: number
  items: Array<{
    productId: number
    quantity: number
    unitPrice: number
  }>
}
