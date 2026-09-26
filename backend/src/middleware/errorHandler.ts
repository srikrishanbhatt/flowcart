import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

// Postgres reports unique violations as SQLSTATE 23505; better-sqlite3 uses its own code.
const isUniqueViolation = (error: any) =>
  error?.code === '23505' || error?.code === 'SQLITE_CONSTRAINT_UNIQUE'

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500
  let message = error.message || 'Internal Server Error'

  if (isUniqueViolation(error)) {
    statusCode = 409
    message = 'A record with the same unique value already exists'
  } else if (error instanceof ZodError) {
    statusCode = 400
    message = error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')
  }

  res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  })
}
