-- Demo data for local development and tests. Safe to run repeatedly.

INSERT INTO users (email, password_hash, role)
VALUES ('admin@flowcart.dev', 'demo-password-hash', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (name, slug)
VALUES ('Accessories', 'accessories'), ('Office', 'office')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, price, stock, category_id)
VALUES
  ('FlowCart Pro Headset', 'flowcart-pro-headset', 'Wireless headset for daily productivity and immersive calls.', 129.99, 18, (SELECT id FROM categories WHERE slug = 'accessories')),
  ('Ergo Desk Mat', 'ergo-desk-mat', 'Comfortable work surface for long coding and design sessions.', 69.00, 24, (SELECT id FROM categories WHERE slug = 'accessories')),
  ('Daily Planner Kit', 'daily-planner-kit', 'Premium planner and stationery set for organized routines.', 39.50, 10, (SELECT id FROM categories WHERE slug = 'office')),
  ('Focus Lamp Pro', 'focus-lamp-pro', 'Warm, adjustable lighting that helps you stay on task through long sessions.', 88.00, 12, (SELECT id FROM categories WHERE slug = 'office'))
ON CONFLICT (slug) DO NOTHING;
