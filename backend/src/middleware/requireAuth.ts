import type { Request, RequestHandler } from 'express'
import { authService, type AuthUser } from '../services/auth.service.js'

// Authentication middleware: rejects the request with 401 unless it carries a valid
// "Authorization: Bearer <token>" header, and otherwise sets req.user for the routes after it.
// Routes must take the user from req.user, never from the URL or body, which clients control.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null

  if (!token) {
    next(Object.assign(new Error('Authentication required'), { statusCode: 401 }))
    return
  }

  try {
    req.user = authService.verifyToken(token)
    next()
  } catch (error) {
    next(error)
  }
}

// For routes behind requireAuth. Throws 401 rather than crashing if a route is ever
// mounted without the middleware by mistake.
export const getAuthUser = (req: Request): AuthUser => {
  if (!req.user) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 })
  }

  return req.user
}
