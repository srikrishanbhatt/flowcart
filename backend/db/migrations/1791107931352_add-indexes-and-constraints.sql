-- Up Migration

-- Postgres indexes primary keys and UNIQUE columns automatically, but NOT the
-- referencing side of a foreign key. These columns are used in joins/filters, and
-- deleting a parent row (e.g. a product) scans them to check for references.
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);
CREATE INDEX idx_cart_items_product_id ON cart_items (product_id);
-- cart_items.cart_id and carts.user_id are covered by the UNIQUE constraints below.

-- Product listing. Partial indexes (WHERE is_active) only contain rows customers can
-- see, so they stay smaller. Queries must say `is_active = true` for them to apply.
-- The trailing id matches the tie-breaker in ORDER BY, so the index gives the exact order.
CREATE INDEX idx_products_active_newest ON products (created_at DESC, id DESC) WHERE is_active;
CREATE INDEX idx_products_active_price ON products (price, id) WHERE is_active;

-- Search with ILIKE '%term%'. A B-tree can't help when the match can start anywhere;
-- a trigram index splits names into 3-letter chunks ("mou", "ous", "use") it can look up.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- Integrity: one cart per user, and one row per product within a cart. These also
-- enable atomic upserts (INSERT ... ON CONFLICT) instead of check-then-insert races.
ALTER TABLE carts ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);
ALTER TABLE cart_items ADD CONSTRAINT cart_items_cart_id_product_id_key UNIQUE (cart_id, product_id);

-- Down Migration

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_product_id_key;
ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_user_id_key;
DROP INDEX IF EXISTS idx_products_name_trgm;
DROP INDEX IF EXISTS idx_products_active_price;
DROP INDEX IF EXISTS idx_products_active_newest;
DROP INDEX IF EXISTS idx_cart_items_product_id;
DROP INDEX IF EXISTS idx_order_items_product_id;
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_orders_user_id;
DROP INDEX IF EXISTS idx_products_category_id;
-- pg_trgm is left installed: other objects may depend on it.
