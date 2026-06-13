import { NextFunction, Request, Response } from 'express'
import { createClerkClient, verifyToken } from '@clerk/backend'
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

type CachedAdmin = NonNullable<AuthenticatedRequest['admin']> & {
  status: string
  lastLoginAt?: Date
}

const rolePermissions = {
  admin: { clients: 'admin', projects: 'admin', tasks: 'admin', quotes: 'admin', users: 'admin' },
  gestor: { clients: 'write', projects: 'write', tasks: 'write', quotes: 'write', users: 'read' },
}

const userCache = new Map<string, { expiresAt: number; user: CachedAdmin }>()
const USER_CACHE_TTL_MS = 60_000
const LAST_LOGIN_TOUCH_MS = 10 * 60_000

const getClerkEmail = (clerkUser: any) => {
  const primary = clerkUser.emailAddresses?.find((email: any) => email.id === clerkUser.primaryEmailAddressId)
  return primary?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || `${clerkUser.id}@clerk.local`
}

const getClerkName = (clerkUser: any) => {
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ')
  return fullName || getClerkEmail(clerkUser)
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

    const cached = userCache.get(clerkId)
    if (cached && cached.expiresAt > Date.now()) {
      if (cached.user.status === 'inactive') throw createError('Usuario no autorizado', 403)
      req.admin = cached.user
      next()
      return
    }

    await connectToDatabase()
    let user = await AdminModel.findOne({ clerkId })
    if (!user) {
      const clerkUser = await createClerkClient({ secretKey: secret }).users.getUser(clerkId)
      const existingUsers = await AdminModel.countDocuments()
      const role = existingUsers === 0 ? 'admin' : 'gestor'
      user = await AdminModel.create({
        clerkId,
        email: getClerkEmail(clerkUser).toLowerCase(),
        name: getClerkName(clerkUser),
        role,
        status: 'active',
        permissions: rolePermissions[role],
      })
    }

    if (!user || user.status === 'inactive') {
      throw createError('Usuario no autorizado', 403)
    }

    const admin = {
      id: user._id.toString(),
      clerkId,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    }

    userCache.set(clerkId, { expiresAt: Date.now() + USER_CACHE_TTL_MS, user: admin })
    req.admin = admin

    const lastTouch = user.lastLoginAt?.getTime?.() || 0
    if (Date.now() - lastTouch > LAST_LOGIN_TOUCH_MS) {
      AdminModel.updateOne({ clerkId }, { $set: { lastLoginAt: new Date() } }).catch((updateError) => {
        console.error('Error updating lastLoginAt:', updateError)
      })
    }

    next()
  } catch (error) {
    next(error instanceof Error ? error : createError('No autorizado', 401))
  }
}
