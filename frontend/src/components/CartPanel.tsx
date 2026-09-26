import type { CartItem, Product } from '../types'

type CartPanelProps = {
  cart: CartItem[]
  products: Product[]
  cartSummary: number
  onQuantityChange: (productId: number, delta: number) => void
  onCheckout: () => void
}

export function CartPanel({ cart, products, cartSummary, onQuantityChange, onCheckout }: CartPanelProps) {
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <aside className="cart-panel">
      <div className="cart-header">
        <h2>Cart</h2>
        <span>{cartCount} items</span>
      </div>

      {cart.length === 0 ? (
        <p className="empty-cart">Your cart is empty.</p>
      ) : (
        <div className="cart-items">
          {cart.map((item) => {
            const product = products.find((entry) => entry.id === item.productId)

            if (!product) {
              return null
            }

            return (
              <div className="cart-item" key={item.productId}>
                <div className="cart-item-copy">
                  <h3>{product.name}</h3>
                  <div className="quantity-control">
                    <button type="button" onClick={() => onQuantityChange(item.productId, -1)}>
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => onQuantityChange(item.productId, 1)}>
                      +
                    </button>
                  </div>
                  <p>
                    {item.quantity} × ${product.price.toFixed(2)}
                  </p>
                </div>
                <div className="cart-item-total">
                  <strong>${(product.price * item.quantity).toFixed(2)}</strong>
                  <button type="button" className="remove-item" onClick={() => onQuantityChange(item.productId, -999)}>
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="cart-total">
        <span>Subtotal</span>
        <strong>${cartSummary.toFixed(2)}</strong>
      </div>

      <button type="button" className="checkout-button" onClick={onCheckout}>
        Proceed to checkout
      </button>
    </aside>
  )
}
