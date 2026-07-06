import { NextResponse } from 'next/server'
import { createClerkClient, verifyToken } from '@clerk/backend'
import {
  createFetchPrimaryEmail,
  getPrimaryEmail,
  permissionRank,
  resolveAdminRecordByIdentity,
  resolveDefaultPermissions,
  type AdminRole,
  type PermissionKey,
  type PermissionLevel,
} from '@servasmar/utils'
import { connectToDatabase } from '../../../../../api/src/config/db'
import { AdminModel } from '../../../../../api/src/models/Admin'

// Express shape parity

export type AuthenticatedAdmin = {
  id: string
  clerkId: string
  email: string
  role: string
  permissions?: Record<string, string>
  status: string
  lastLoginAt?: Date
}

const getCached = new Map<string, { expiresAt: number; user: AuthenticatedAdmin }>()
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
  if (!secret) throw new Error('CLERK_SECRET_KEY no configurado')
  return createClerkClient({ secretKey: secret })
}

const logAuthEvent = (message: string, context: Record<string, unknown>) => {
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[auth:web] ${message}`, context)
  }
}

export async function resolveAdminRecord(clerkId: string, emailHint?: string): Promise<any | null> {
  await connectToDatabase()

  return resolveAdminRecordByIdentity<any>({
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

export async function requireAdmin(req: Request): Promise<AuthenticatedAdmin | Response> {
  try {
    const token = req.headers.get('x-clerk-session-token')
    if (!token) {
      return NextResponse.json({ success: false, error: { message: 'No autorizado' } }, { status: 401 }) as any
    }

    const secret = process.env.CLERK_SECRET_KEY
    if (!secret) {
      return NextResponse.json({ success: false, error: { message: 'CLERK_SECRET_KEY no configurado' } }, { status: 500 }) as any
    }

    const authorizedParties = getAuthorizedParties()
    const payload = await verifyToken(token, {
      secretKey: secret,
      jwtKey: getJwtKey(),
      ...(authorizedParties?.length ? { authorizedParties } : {}),
    })
    const clerkId = (payload as any).sub
    if (!clerkId) {
      return NextResponse.json({ success: false, error: { message: 'No autorizado' } }, { status: 401 }) as any
    }

    const cached = getCached.get(clerkId)
    if (cached && cached.expiresAt > Date.now()) {
      if (cached.user.status === 'inactive') {
        return NextResponse.json({ success: false, error: { message: 'Usuario no autorizado' } }, { status: 403 }) as any
      }
      return cached.user
    }

    const user = await resolveAdminRecord(clerkId, (payload as any).email)

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Usuario no autorizado. Solicita acceso al administrador.' } },
        { status: 403 }
      ) as any
    }

    if (!user || user.status === 'inactive') {
      return NextResponse.json({ success: false, error: { message: 'Usuario no autorizado' } }, { status: 403 }) as any
    }

    const admin: AuthenticatedAdmin = {
      id: user._id.toString(),
      clerkId,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    }

    getCached.set(clerkId, { expiresAt: Date.now() + USER_CACHE_TTL_MS, user: admin })

    const lastTouch = (user.lastLoginAt as any)?.getTime?.() || 0
    if (Date.now() - lastTouch > LAST_LOGIN_TOUCH_MS) {
      AdminModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {})
    }

    return admin
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            'Sesión inválida. Verifica que CLERK_SECRET_KEY del API corresponda al NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY de la web.',
        },
      },
      { status: 401 }
    ) as any
  }
}

export async function requirePermission(req: Request, permission: PermissionKey, minimum: PermissionLevel = 'read') {
  const admin = await requireAdmin(req)
  // admin can be a NextResponse cast if unauthorized
  if (admin instanceof Response) return admin

  if (admin.role === 'admin') return admin

  const current = (admin.permissions?.[permission] || resolveDefaultPermissions(admin.role as AdminRole)?.[permission] || 'none') as PermissionLevel
  if (permissionRank[current] >= permissionRank[minimum]) return admin

  return NextResponse.json(
    { success: false, error: { message: 'No tienes permisos para realizar esta acción' } },
    { status: 403 }
  ) as any
}
