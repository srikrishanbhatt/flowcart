import type { Request, Response, NextFunction } from 'express'

export const notFoundMiddleware = (_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: new Date().toISOString(),
  })
}
