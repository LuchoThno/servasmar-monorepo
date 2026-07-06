import { NextFunction, Request, Response } from 'express'
import { createClerkClient, verifyToken } from '@clerk/backend'
import {
  createFetchPrimaryEmail,
  permissionRank,
  resolveAdminRecordByIdentity,
  resolveDefaultPermissions,
  type AdminRole,
  type PermissionKey,
  type PermissionLevel,
} from '@servasmar/utils'
import { connectToDatabase } from '../config/db'
import { AdminModel, type AdminDocument } from '../models/Admin'
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
  lastLoginAt?: Date | null
}

type AdminRecord = AdminDocument & {
  _id: { toString(): string }
}

type ClerkJwtPayload = {
  sub?: string
  email?: string
}

const userCache = new Map<string, { expiresAt: number; user: CachedAdmin }>()
const USER_CACHE_TTL_MS = 60_000
const LAST_LOGIN_TOUCH_MS = 10 * 60_000

const getAuthorizedParties = () =>
  process.env.CLERK_AUTHORIZED_PARTIES
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const getJwtKey = () => process.env.CLERK_JWT_KEY?.replace(/\\n/g, '\n')

const clerkClient = () => {
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) throw createError('CLERK_SECRET_KEY no configurado', 500)
  return createClerkClient({ secretKey: secret })
}

const logAuthEvent = (message: string, context: Record<string, unknown>) => {
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[auth:api] ${message}`, context)
  }
}

const resolveAdminRecord = async (clerkId: string, emailHint?: string): Promise<AdminRecord | null> => {
  await connectToDatabase()

  return resolveAdminRecordByIdentity<AdminRecord>({
    clerkId,
    emailHint,
    findByClerkId: (currentClerkId) => AdminModel.findOne({ $or: [{ clerkId: currentClerkId }, { clerkIds: currentClerkId }] }),
    findAndLinkByEmail: ({ clerkId: currentClerkId, email }) =>
      AdminModel.findOneAndUpdate(
        { email },
        {
          $set: { clerkId: currentClerkId, email },
          $addToSet: { clerkIds: currentClerkId },
        },
        { new: true }
      ),
    fetchClerkEmail: createFetchPrimaryEmail((currentClerkId) => clerkClient().users.getUser(currentClerkId)),
    onClerkEmailLookupFailed: ({ clerkId: currentClerkId, error }) => {
      logAuthEvent('clerk_email_lookup_failed', {
        clerkId: currentClerkId,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    },
    onAdminReconciled: ({ clerkId: currentClerkId, email }) => {
      logAuthEvent('admin_reconciled_by_email', { clerkId: currentClerkId, email })
    },
  })
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

    const authorizedParties = getAuthorizedParties()
    const payload = await verifyToken(token, {
      secretKey: secret,
      jwtKey: getJwtKey(),
      ...(authorizedParties?.length ? { authorizedParties } : {}),
    })
    const clerkPayload = payload as ClerkJwtPayload
    const clerkId = clerkPayload.sub
    if (!clerkId) throw createError('No autorizado', 401)

    const cached = userCache.get(clerkId)
    if (cached && cached.expiresAt > Date.now()) {
      if (cached.user.status === 'inactive') throw createError('Usuario no autorizado', 403)
      req.admin = cached.user
      next()
      return
    }

    const user = await resolveAdminRecord(clerkId, clerkPayload.email)
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

  const current = (admin.permissions?.[permission] || resolveDefaultPermissions(admin.role as AdminRole)?.[permission] || 'none') as PermissionLevel
  if (permissionRank[current] >= permissionRank[minimum]) {
    next()
    return
  }

  next(createError('No tienes permisos para realizar esta acción', 403))
}
