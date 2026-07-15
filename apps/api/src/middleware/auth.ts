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

type PermissionKey = 'clients' | 'projects' | 'tasks' | 'quotes' | 'finance' | 'users'
type PermissionLevel = 'none' | 'read' | 'write' | 'admin'
type AdminRole = 'admin' | 'gestor' | 'visor'

type CachedAdmin = NonNullable<AuthenticatedRequest['admin']> & {
  status: string
  lastLoginAt?: Date
}

const rolePermissions: Record<AdminRole, Record<PermissionKey, PermissionLevel>> = {
  admin: { clients: 'admin', projects: 'admin', tasks: 'admin', quotes: 'admin', finance: 'admin', users: 'admin' },
  gestor: { clients: 'write', projects: 'write', tasks: 'write', quotes: 'write', finance: 'write', users: 'none' },
  visor: { clients: 'read', projects: 'read', tasks: 'read', quotes: 'read', finance: 'read', users: 'none' },
}

const userCache = new Map<string, { expiresAt: number; user: CachedAdmin }>()
const USER_CACHE_TTL_MS = 60_000
const LAST_LOGIN_TOUCH_MS = 10 * 60_000
const permissionRank: Record<PermissionLevel, number> = { none: 0, read: 1, write: 2, admin: 3 }

const getAuthorizedParties = () =>
  process.env.CLERK_AUTHORIZED_PARTIES
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const getJwtKey = () => process.env.CLERK_JWT_KEY?.replace(/\\n/g, '\n')

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

    const authorizedParties = getAuthorizedParties()
    const payload = await verifyToken(token, {
      secretKey: secret,
      jwtKey: getJwtKey(),
      ...(authorizedParties?.length ? { authorizedParties } : {}),
    })
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
    const user = await AdminModel.findOne({ $or: [{ clerkId }, { clerkIds: clerkId }] })
    if (!user) {
      throw createError('Usuario no autorizado. Solicita acceso al administrador.', 403)
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
      AdminModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).catch((updateError) => {
        console.error('Error updating lastLoginAt:', updateError)
      })
    }

    next()
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      next(error)
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('Error validating Clerk session:', error)
    }

    next(createError('Sesión inválida. Verifica que CLERK_SECRET_KEY del API corresponda al NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY de la web.', 401))
  }
}

export const clearAdminCache = (clerkId?: string) => {
  if (clerkId) {
    userCache.delete(clerkId)
    return
  }
  userCache.clear()
}

export const requirePermission = (permission: PermissionKey, minimum: PermissionLevel = 'read') => (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const admin = req.admin
  if (!admin) {
    next(createError('No autorizado', 401))
    return
  }
  if (admin.role === 'admin') {
    next()
    return
  }

  const current = (admin.permissions?.[permission] || rolePermissions[admin.role as AdminRole]?.[permission] || 'none') as PermissionLevel
  if (permissionRank[current] >= permissionRank[minimum]) {
    next()
    return
  }

  next(createError('No tienes permisos para realizar esta acción', 403))
}
