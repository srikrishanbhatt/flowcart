import type { AuthUser } from '../services/auth.service.js'

// Declaration merging: adds `req.user` to Express's Request type, so routes behind
// requireAuth can read the authenticated user with full type checking.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export {}
