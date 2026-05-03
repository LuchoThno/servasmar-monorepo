import { NextFunction, Request, Response } from 'express'

export interface ApiError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err)
  }

  // Don't leak error details in production
  const isProduction = process.env.NODE_ENV === 'production'

  res.status(statusCode).json({
    success: false,
    error: {
      message: isProduction && statusCode === 500 ? 'Internal Server Error' : message,
      ...(isProduction ? {} : { stack: err.stack })
    }
  })
}

export const createError = (message: string, statusCode: number): ApiError => {
  const error: ApiError = new Error(message)
  error.statusCode = statusCode
  error.isOperational = true
  return error
}
