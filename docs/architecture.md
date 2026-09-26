# FlowCart Architecture Overview

## 1. System purpose

FlowCart is an e-commerce platform that demonstrates both customer-facing and admin-facing workflows. The system is designed to teach production-style architecture patterns while remaining understandable and incremental.

## 2. Architectural direction

The project starts as a modular monolith and later evolves toward event-driven architecture and eventually microservices.

This progression is intentional:
- first, we learn the fundamentals
- then we add data access and business logic
- then we separate concerns with real infrastructure pieces like Redis and RabbitMQ
- then we split into services only when the monolith is well understood

## 3. Initial architecture for Phase 1

### High-level view

Client
  ↓
React Frontend
  ↓
Node.js API
  ↓
PostgreSQL (planned)

This is the initial shape for Phase 1:
- frontend is responsible for user interaction
- backend exposes APIs
- database access is introduced later when the foundation is stable

## 4. Separation of concerns

### Frontend responsibilities
- route management
- rendering pages
- form handling
- API calls
- client-side state
- user interactions

### Backend responsibilities
- HTTP routing
- request validation
- business logic
- middleware
- error handling
- environment-driven configuration

### Shared responsibilities
- TypeScript contracts
- API response conventions
- environment variables
- shared conventions and documentation

## 5. Why not build everything at once?

Large systems fail when all complexity is introduced at once. The project intentionally adds one layer at a time so each decision can be explained and validated.

This helps us answer questions such as:
- what problem is this technology solving?
- why is it the right layer for this concern?
- what are the alternatives?
- what trade-offs exist?

## 6. Proposed folder structure

```text
flowcart/
├─ README.md
├─ .gitignore
├─ .editorconfig
├─ .prettierrc
├─ .eslintrc.json
├─ package.json
├─ docs/
│  ├─ architecture.md
│  ├─ roadmap.md
│  └─ phase-1-foundation.md
├─ frontend/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ vite.config.ts
│  ├─ index.html
│  ├─ .env.example
│  └─ src/
│     ├─ app/
│     ├─ components/
│     ├─ pages/
│     ├─ hooks/
│     ├─ services/
│     ├─ store/
│     ├─ types/
│     ├─ utils/
│     ├─ styles/
│     └─ main.tsx
└─ backend/
   ├─ package.json
   ├─ tsconfig.json
   ├─ .env.example
   ├─ src/
   │  ├─ app.ts
   │  ├─ server.ts
   │  ├─ config/
   │  ├─ routes/
   │  ├─ controllers/
   │  ├─ middleware/
   │  ├─ services/
   │  ├─ validators/
   │  ├─ utils/
   │  └─ types/
   └─ tests/
      └─ health.test.ts
```

## 7. Phase 1 focus

The first phase is intentionally small and foundational.

We will build:
- frontend starter app
- backend express server
- TypeScript configuration
- basic environment configuration
- health-check endpoint
- linting and formatting setup
- clean project structure

## 8. Why these choices?

### React
React is ideal for building a rich front-end experience and gives a strong base for later patterns like routing, filtering, forms, and state management.

### Express
Express is a good learning tool for API design, middleware, and route handling. It is simple enough for early phases and extensible enough for future growth.

### TypeScript
TypeScript reduces runtime surprises and gives us safer contracts across the app. It is essential in a project aiming for senior-level engineering habits.

### PostgreSQL
PostgreSQL will be introduced in Phase 2 because it is the right database for relational data and transactional workflows.

## 9. Expected trade-offs

### Pros of this approach
- clear learning path
- easier debugging
- cleaner boundaries
- easier future refactoring
- more realistic architecture progression

### Cons
- more setup than a single-app approach
- requires coordination between frontend and backend
- can feel slower at the beginning

## 10. Interview themes to practice

- Why do we separate frontend and backend early?
- Why is TypeScript beneficial in a system with many moving parts?
- Why is a health check endpoint valuable before feature development?
- What does clean project structure buy us in larger systems?
- How does a modular architecture improve maintainability?

## 11. Success criteria for Phase 1

The phase is successful when:
- the frontend can start locally
- the backend starts locally
- the backend health endpoint responds correctly
- environment variables are managed cleanly
- the code structure is understandable and maintainable

## 12. Summary

Phase 1 is about building the scaffolding needed to support every later phase. It is not about shipping a full commerce platform yet. It is about creating a correct foundation for learning and scaling.
