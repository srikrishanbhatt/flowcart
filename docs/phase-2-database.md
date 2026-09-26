# Phase 2 — Database & Basic CRUD

## Goal

Introduce PostgreSQL and the first data model for FlowCart. This phase is focused on making the application persist data instead of relying only on in-memory structures.

## Why this matters

The project is moving from a UI and API foundation into real business data. Database design is where system thinking becomes practical.

We are learning:
- relational model design
- primary and foreign keys
- indexes
- transactions
- migration mindset
- querying and filtering
- data integrity

## Proposed domain model

### Users
- id
- email
- password_hash
- role
- created_at

### Categories
- id
- name
- slug
- created_at

### Products
- id
- category_id
- name
- slug
- description
- price
- stock
- is_active
- created_at

### Cart
- id
- user_id
- created_at

### Cart items
- id
- cart_id
- product_id
- quantity
- created_at

### Orders
- id
- user_id
- total
- status
- created_at

### Order items
- id
- order_id
- product_id
- quantity
- unit_price
- created_at

### Inventory
Inventory is conceptually represented by product stock and can later be managed more explicitly as a dedicated inventory table.

## Current implementation status

The backend has a product repository and service layer that supports a clean domain boundary even before PostgreSQL is fully connected in a local Docker environment.

## Design principles

- keep tables focused on a single domain responsibility
- keep IDs as primary keys
- use foreign keys for relationships
- avoid over-engineering early
- write simple, understandable SQL

## Interview focus

- What is a foreign key and why is it important?
- Why is a transaction useful for order creation?
- What is the difference between normalized and denormalized data?
- Why use indexes for filtering and sorting?
- How do you prevent invalid order data?

## Next step

Continue with category, cart, and order data models and then connect the application to PostgreSQL in a proper local environment.
