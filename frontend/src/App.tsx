import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AuthPanel } from './components/AuthPanel'
import { CartPanel } from './components/CartPanel'
import { ProductCatalog } from './components/ProductCatalog'
import type { AuthForm, AuthMode, Category, CartItem, Product, UserSession } from './types'

const fallbackProducts: Product[] = [
  {
    id: 1,
    name: 'FlowCart Pro Headset',
    description: 'Wireless headset for daily productivity and immersive calls.',
    price: 129.99,
    stock: 18,
    categoryId: 1,
    isActive: true,
  },
  {
    id: 2,
    name: 'Ergo Desk Mat',
    description: 'Comfortable work surface for long coding and design sessions.',
    price: 69.0,
    stock: 24,
    categoryId: 1,
    isActive: true,
  },
  {
    id: 3,
    name: 'Daily Planner Kit',
    description: 'Premium planner and stationery set for organized routines.',
    price: 39.5,
    stock: 10,
    categoryId: 2,
    isActive: true,
  },
]

const fallbackCategories: Category[] = [
  { id: 1, name: 'Accessories', slug: 'accessories' },
  { id: 2, name: 'Office', slug: 'office' },
]

const readSavedSession = () => {
  const savedSession = localStorage.getItem('flowcart-session')

  if (!savedSession) {
    return null
  }

  try {
    return JSON.parse(savedSession) as { token: string; user: UserSession }
  } catch {
    localStorage.removeItem('flowcart-session')
    return null
  }
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>(fallbackCategories)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState<AuthForm>({ email: '', password: '', role: 'CUSTOMER' })
  // Lazy initializers read the saved session once, during the first render,
  // so there is no extra render and no window where the session looks logged out.
  const [user, setUser] = useState<UserSession | null>(() => readSavedSession()?.user ?? null)
  const [token, setToken] = useState<string | null>(() => readSavedSession()?.token ?? null)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!token || !user) {
      localStorage.removeItem('flowcart-session')
      return
    }

    localStorage.setItem('flowcart-session', JSON.stringify({ token, user }))
  }, [token, user])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          fetch('http://localhost:4000/api/products'),
          fetch('http://localhost:4000/api/categories'),
        ])

        if (productsResponse.ok) {
          const productData = (await productsResponse.json()) as Product[]
          setProducts(productData.length > 0 ? productData : fallbackProducts)
        } else {
          setProducts(fallbackProducts)
        }

        if (categoriesResponse.ok) {
          const categoryData = (await categoriesResponse.json()) as Category[]
          setCategories(categoryData.length > 0 ? categoryData : fallbackCategories)
        } else {
          setCategories(fallbackCategories)
        }
      } catch {
        setProducts(fallbackProducts)
        setCategories(fallbackCategories)
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const addToCart = async (productId: number) => {
    const existingItem = cart.find((item) => item.productId === productId)
    const nextQuantity = (existingItem?.quantity ?? 0) + 1

    const nextCart = existingItem
      ? cart.map((item) => (item.productId === productId ? { ...item, quantity: nextQuantity } : item))
      : [...cart, { productId, quantity: 1 }]

    setCart(nextCart)

    try {
      await fetch('http://localhost:4000/api/cart/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      })
    } catch {
      // intentionally ignore API failure in this learning-stage storefront
    }
  }

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.productId === productId)

      if (!existingItem) {
        return currentCart
      }

      const nextQuantity = existingItem.quantity + delta

      if (nextQuantity <= 0) {
        return currentCart.filter((item) => item.productId !== productId)
      }

      return currentCart.map((item) => (item.productId === productId ? { ...item, quantity: nextQuantity } : item))
    })
  }

  const checkoutOrder = async () => {
    if (cart.length === 0) {
      return
    }

    const items = cart
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId)

        if (!product) {
          return null
        }

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
        }
      })
      .filter((item): item is { productId: number; quantity: number; unitPrice: number } => item !== null)

    if (items.length === 0) {
      return
    }

    try {
      await fetch('http://localhost:4000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1, items }),
      })

      setCart([])
    } catch {
      // intentionally ignore API failure in this learning-stage storefront
    }
  }

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'all' || product.categoryId === Number(selectedCategory)
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesCategory && matchesSearch
    })
  }, [products, searchTerm, selectedCategory])

  const cartSummary = useMemo(() => {
    return cart.reduce((total, item) => {
      const product = products.find((entry) => entry.id === item.productId)

      if (!product) {
        return total
      }

      return total + product.price * item.quantity
    }, 0)
  }, [cart, products])

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleAuthFieldChange = (field: keyof AuthForm, value: string) => {
    setAuthForm((current) => ({ ...current, [field]: value }))
  }

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
    const requestBody =
      authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password, role: authForm.role }

    try {
      const response = await fetch(`http://localhost:4000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = (await response.json()) as { token?: string; user?: UserSession; message?: string }

      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.message ?? 'Authentication failed')
      }

      setToken(data.token)
      setUser(data.user)
      setAuthForm({ email: '', password: '', role: 'CUSTOMER' })
      setAuthMessage(authMode === 'login' ? 'Welcome back!' : 'Account created successfully.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed')
    }
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    setAuthMessage('Logged out successfully.')
    setAuthError('')
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <header className="topbar">
          <div className="brand-wrap">
            <div className="brand-mark">F</div>
            <div>
              <span className="brand-name">FlowCart</span>
            </div>
          </div>

          <nav className="main-nav" aria-label="Main navigation">
            <a href="#">New In</a>
            <a href="#">Accessories</a>
            <a href="#">Office</a>
            <a href="#">Best Sellers</a>
          </nav>

          <div className="topbar-actions">
            {user ? (
              <div className="user-pill">
                <span>Hi, {user.email}</span>
                <button type="button" className="nav-link-button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button type="button" className="nav-link-button" onClick={() => setAuthMode('login')}>
                  Login
                </button>
                <button type="button" className="nav-link-button primary" onClick={() => setAuthMode('register')}>
                  Register
                </button>
              </>
            )}

            <button type="button" className="cart-badge">
              Cart ({cartCount})
            </button>
          </div>
        </header>

        <AuthPanel
          authMode={authMode}
          authForm={authForm}
          user={user}
          authError={authError}
          authMessage={authMessage}
          onModeChange={setAuthMode}
          onFieldChange={handleAuthFieldChange}
          onSubmit={handleAuthSubmit}
          onLogout={handleLogout}
        />

        <div className="hero-banner">
          <div className="hero-copy">
            <p className="eyebrow">Designed for everyday flow</p>
            <h1>Build a space that helps you do more.</h1>
            <p className="subtitle">
              Curated essentials for work, focus, and a smoother daily routine — all in one modern storefront.
            </p>

            <div className="hero-actions">
              <button type="button" className="primary-action">
                Shop now
              </button>
              <button type="button" className="secondary-action">
                Browse collection
              </button>
            </div>

            <div className="feature-row">
              <span>Free shipping over $50</span>
              <span>Fast checkout</span>
              <span>Secure payments</span>
            </div>
          </div>

          <div className="promo-card">
            <span className="promo-tag">Featured bundle</span>
            <h3>Desk setup essentials</h3>
            <div className="promo-price-row">
              <strong>$169</strong>
              <span>Save 20%</span>
            </div>
            <ul>
              <li>Wireless headset</li>
              <li>Ergo desk mat</li>
              <li>Daily planner kit</li>
            </ul>
          </div>
        </div>

        <div className="catalog-layout">
          <ProductCatalog
            products={visibleProducts}
            categories={categories}
            selectedCategory={selectedCategory}
            searchTerm={searchTerm}
            loading={loading}
            onSearchChange={setSearchTerm}
            onCategoryChange={setSelectedCategory}
            onAddToCart={addToCart}
          />

          <CartPanel
            cart={cart}
            products={products}
            cartSummary={cartSummary}
            onQuantityChange={updateCartQuantity}
            onCheckout={checkoutOrder}
          />
        </div>
      </section>
    </main>
  )
}

export default App
