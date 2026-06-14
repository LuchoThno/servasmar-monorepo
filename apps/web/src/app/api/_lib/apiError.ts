import { NextResponse } from 'next/server'

export type ApiErrorPayload = {
  message: string
  stack?: string
}

export class ApiError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
  }
}

export const createError = (message: string, statusCode: number) => {
  return new ApiError(message, statusCode)
}

export const toErrorResponse = (err: unknown) => {
  const isProduction = process.env.NODE_ENV === 'production'
  const e = err as Partial<ApiError> & { message?: string; stack?: string; statusCode?: number }

  const statusCode = e.statusCode || 500
  const message = e.message || 'Internal Server Error'

  const payload: ApiErrorPayload = {
    message: isProduction && statusCode === 500 ? 'Internal Server Error' : message,
    ...(isProduction ? {} : { stack: e.stack }),
  }

  return NextResponse.json({
    success: false,
    error: payload,
  }, { status: statusCode })
}

