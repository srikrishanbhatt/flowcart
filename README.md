# FlowCart

FlowCart is a production-style full-stack learning project designed to help build practical experience with modern frontend, backend, distributed systems, messaging, caching, and cloud concepts.

The project will evolve in phases from a modular monolith into a more event-driven and eventually microservice-based architecture.

## Project vision

FlowCart is an e-commerce and order-management platform with both customer and admin workflows.

Customer goals:
- register and sign in
- browse and search products
- view product details
- add products to a cart
- place orders
- complete a mock payment
- view order history
- track order status
- receive real-time updates

Admin goals:
- manage products
- manage inventory
- review orders
- update order status
- manage users
- monitor system information

## Technology stack

### Frontend
- React.js
- TypeScript
- React Router
- Zustand
- TanStack Query
- Axios
- Socket.IO client

### Backend
- Node.js
- TypeScript
- Express.js
- PostgreSQL
- Redis
- RabbitMQ
- Socket.IO

### Infrastructure and DevOps
- Docker
- Docker Compose
- Nginx
- GitHub Actions
- AWS later

### Testing
- Vitest or Jest
- Supertest
- React Testing Library
- Playwright later

### Observability
- structured logging
- Prometheus
- Grafana
- OpenTelemetry

## Architectural rule

We will not build the whole application at once. We will follow a staged roadmap and only move to the next phase when the current one is understood and verified.

## Phased roadmap

### Phase 1 — Project Foundation
- React frontend setup
- Node.js + TypeScript backend setup
- Express server
- PostgreSQL integration setup
- project structure and environment configuration
- linting and formatting
- health-check endpoint

### Phase 2 — Database and CRUD
- users
- products
- categories
- cart
- orders
- order items
- inventory
- PostgreSQL schema and migrations

### Phase 3 — Authentication and Authorization
- registration
- login
- password hashing
- JWT access token
- refresh token
- logout
- RBAC roles

### Phase 4 — Redis
- product caching
- rate limiting
- temporary data
- cache-aside pattern

### Phase 5 — RabbitMQ
- queues
- events
- producers and consumers
- durable messaging and retries

### Phase 6 — Event-driven architecture
- event contracts
- asynchronous workflows
- retry and DLQ patterns
- idempotent consumers

### Phase 7 — Microservices
- API gateway
- user service
- product service
- order service
- inventory service
- payment service
- notification service

### Phase 8 — WebSockets and real-time updates
- order tracking updates
- Socket.IO
- rooms and broadcasts

### Phase 9 — Docker
- containerization of services
- Docker Compose
- local environment orchestration

### Phase 10 — Nginx and scaling
- reverse proxy
- load balancing
- horizontally scaled Node services

### Phase 11 — Testing
- unit tests
- integration tests
- API tests
- frontend tests
- end-to-end testing later

### Phase 12 — CI/CD
- GitHub Actions
- lint/test/build pipeline
- Docker image publishing
- deployment automation

### Phase 13 — AWS
- EC2
- RDS
- ElastiCache
- S3
- CloudFront
- IAM
- CloudWatch
- Secrets Manager

### Phase 14 — Observability
- structured logs
- request correlation
- metrics
- tracing
- Prometheus and Grafana

## Learning goals

This project exists to strengthen senior-level understanding of:
- React architecture
- Node.js architecture
- TypeScript
- REST APIs
- PostgreSQL
- Redis and caching
- rate limiting
- RabbitMQ and event-driven systems
- Docker and infrastructure
- testing and CI/CD
- distributed systems concepts

## Coding standards

- TypeScript everywhere possible
- strict type checking
- clean and readable code
- separation of concerns
- secure configuration
- no hardcoded secrets
- proper validation and error handling
- avoid premature optimization
- avoid unnecessary abstraction

## Git strategy

We will use Git consistently with meaningful commits and clear progression through phases.

Examples:
- feat: initialize frontend
- feat: initialize backend
- feat: add project foundation
- feat: add health checks

## Rules for development

1. Explain the goal before implementation.
2. Explain architecture before writing code.
3. Keep changes small and reviewable.
4. Move one phase at a time.
5. Implement and verify before moving forward.
6. Focus on understanding why the technology is used.

## Current status

This repository is currently being prepared for Phase 1 documentation and setup.

## Next step

Proceed with Phase 1 foundation work after confirming the architecture and documentation structure.
