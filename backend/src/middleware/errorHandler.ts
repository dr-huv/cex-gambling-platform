import { Request, Response, NextFunction } from 'express'

interface Error {
  message: string
  status?: number
  stack?: string
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err)

  const status = err.status || 500
  const message = err.message || 'Internal Server Error'

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' })
}
