import type { Category, Product } from '../types'

type ProductCatalogProps = {
  products: Product[]
  categories: Category[]
  selectedCategory: string
  searchTerm: string
  loading: boolean
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onAddToCart: (productId: number) => void
}

export function ProductCatalog({
  products,
  categories,
  selectedCategory,
  searchTerm,
  loading,
  onSearchChange,
  onCategoryChange,
  onAddToCart,
}: ProductCatalogProps) {
  return (
    <div className="catalog-section">
      <div className="catalog-header">
        <h2>Featured products</h2>
        <span>{products.length} items</span>
      </div>

      <div className="catalog-tools">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search products"
          aria-label="Search products"
        />

        <div className="category-tabs" aria-label="Category filter">
          <button
            type="button"
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => onCategoryChange('all')}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={selectedCategory === String(category.id) ? 'active' : ''}
              onClick={() => onCategoryChange(String(category.id))}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading products...</div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-badge">{product.stock > 0 ? 'In stock' : 'Sold out'}</div>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="product-meta">
                <strong>${product.price.toFixed(2)}</strong>
                <span>{product.stock} left</span>
              </div>
              <button className="add-cart-button" type="button" onClick={() => onAddToCart(product.id)}>
                Add to cart
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
