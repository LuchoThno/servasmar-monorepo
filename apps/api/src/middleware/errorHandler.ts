import { NextFunction, Request, Response } from 'express'

export interface ApiError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const createError = (message: string, statusCode: number): ApiError => {
  const error: ApiError = new Error(message)
  error.statusCode = statusCode
  error.isOperational = true
  return error
}

export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  void next
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'
  const isProduction = process.env.NODE_ENV === 'production'

  if (!isProduction) {
    console.error('Error:', err)
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: isProduction && statusCode === 500 ? 'Internal Server Error' : message,
      ...(isProduction ? {} : { stack: err.stack }),
    },
  })
}
