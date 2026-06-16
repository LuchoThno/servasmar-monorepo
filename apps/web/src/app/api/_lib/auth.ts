import { NextResponse } from 'next/server'
import { verifyToken } from '@clerk/backend'
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

type PermissionKey = 'clients' | 'projects' | 'tasks' | 'quotes' | 'users'
type PermissionLevel = 'none' | 'read' | 'write' | 'admin'
type AdminRole = 'admin' | 'gestor' | 'visor'

const permissionRank: Record<PermissionLevel, number> = { none: 0, read: 1, write: 2, admin: 3 }
const rolePermissions: Record<AdminRole, Record<PermissionKey, PermissionLevel>> = {
  admin: { clients: 'admin', projects: 'admin', tasks: 'admin', quotes: 'admin', users: 'admin' },
  gestor: { clients: 'write', projects: 'write', tasks: 'write', quotes: 'write', users: 'none' },
  visor: { clients: 'read', projects: 'read', tasks: 'read', quotes: 'read', users: 'none' },
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

    await connectToDatabase()
    const user = await AdminModel.findOne({ $or: [{ clerkId }, { clerkIds: clerkId }] })

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

  const current = (admin.permissions?.[permission] || rolePermissions[admin.role as AdminRole]?.[permission] || 'none') as PermissionLevel
  if (permissionRank[current] >= permissionRank[minimum]) return admin

  return NextResponse.json(
    { success: false, error: { message: 'No tienes permisos para realizar esta acción' } },
    { status: 403 }
  ) as any
}

export function resolveDefaultPermissions(role: string) {
  return rolePermissions[role as AdminRole] || {}
}
