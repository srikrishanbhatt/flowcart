# Phase 1 — Project Foundation

## Objective

Set up the foundational codebase for FlowCart with a clean split between frontend and backend, strong TypeScript usage, and a basic health-check endpoint.

## Goals

- initialize React frontend
- initialize Node.js + TypeScript backend
- set up Express API server
- configure environment variables
- define a clean project structure
- add linting and formatting standards
- establish a health endpoint for verification

## What problem are we solving?

Before building e-commerce features, we need a stable base for the application. If the project structure, tooling, and config are weak, later work will become harder to reason about and more fragile.

## Why this matters

This phase teaches the fundamentals every strong engineering team depends on:
- project initialization
- environment configuration
- TypeScript safety
- API basics
- separation of concerns
- testing the application foundation before feature work

## Proposed architecture

### Frontend
- React + TypeScript
- Vite for local development
- route-level structure
- service layer for API communication
- easy extension for later pages and stores

### Backend
- Express + TypeScript
- route and controller separation
- centralized middleware
- environment-driven runtime config
- health endpoint as initial verification point

## Files to create during Phase 1

### Root files
- README.md
- .gitignore
- .editorconfig
- .prettierrc
- .eslintrc.json
- package.json

### Frontend files
- frontend/package.json
- frontend/tsconfig.json
- frontend/vite.config.ts
- frontend/index.html
- frontend/.env.example
- frontend/src/main.tsx
- frontend/src/app/App.tsx
- frontend/src/services/api.ts

### Backend files
- backend/package.json
- backend/tsconfig.json
- backend/.env.example
- backend/src/server.ts
- backend/src/app.ts
- backend/src/config/env.ts
- backend/src/routes/health.routes.ts
- backend/src/controllers/health.controller.ts
- backend/src/middleware/errorHandler.ts
- backend/src/middleware/notFound.ts
- backend/tests/health.test.ts

## Example backend health endpoint

```ts
GET /api/health

Response:
{
  status: 'ok',
  service: 'flowcart-api',
  timestamp: '2026-09-23T12:00:00.000Z'
}
```

## Environment configuration

Use .env.example files to document required configuration without exposing real secrets.

Examples:
- PORT
- NODE_ENV
- FRONTEND_URL
- DATABASE_URL (added later)

## Development workflow

1. install dependencies in frontend and backend
2. configure environment variables
3. start backend server
4. run a health-check request
5. start frontend app
6. verify the application boots cleanly

## Risks and failure modes

- missing environment variables
- incorrect TypeScript configuration
- route wiring mistakes
- port conflicts
- unhandled runtime errors

## How we handle failure

- centralize error middleware
- validate configuration at startup
- keep endpoints minimal and testable
- use a dedicated health endpoint for runtime validation

## Interview questions for this phase

- Why do we start with a health-check endpoint instead of full business logic?
- What is the benefit of using TypeScript in both frontend and backend?
- Why separate frontend and backend code into different apps at this stage?
- What is the purpose of environment variables?
- Why do we create .env.example files instead of committing real secrets?

## Success criteria

This phase is complete when:
- both apps are initialized
- the backend health endpoint responds successfully
- TypeScript compiles without critical errors
- configuration is documented clearly
- the project layout is clean and understandable

## Summary

Phase 1 is about constructing a strong base. It teaches the principles that later phases will build on: clean architecture, config management, API basics, and disciplined engineering habits.
