import { NextFunction, Request, Response } from 'express'
import { verifyToken } from '@clerk/backend'
import { connectToDatabase } from '../config/db'
import { AdminModel } from '../models/Admin'
import { createError } from './errorHandler'

export interface AuthenticatedRequest extends Request {
  admin?: {
    id: string
    clerkId: string
    email: string
    role: string
    permissions?: Record<string, string>
  }
}

export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers['x-clerk-session-token']

    if (!token || Array.isArray(token)) {
      throw createError('No autorizado', 401)
    }

    const secret = process.env.CLERK_SECRET_KEY
    if (!secret) {
      throw createError('CLERK_SECRET_KEY no configurado', 500)
    }

    const payload = await verifyToken(token, { secretKey: secret })
    const clerkId = payload.sub
    if (!clerkId) throw createError('No autorizado', 401)

    await connectToDatabase()
    const user = await AdminModel.findOne({ clerkId })
    if (!user || user.status === 'inactive') {
      throw createError('Usuario no autorizado', 403)
    }

    user.lastLoginAt = new Date()
    await user.save()

    req.admin = {
      id: user._id.toString(),
      clerkId,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    }
    next()
  } catch (error) {
    next(error instanceof Error ? error : createError('No autorizado', 401))
  }
}
