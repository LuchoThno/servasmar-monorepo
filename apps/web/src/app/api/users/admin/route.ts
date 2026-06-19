import { createClerkClient } from '@clerk/backend'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../api/src/config/db'
import { AdminModel } from '../../../../../../api/src/models/Admin'
import { createError, toErrorResponse } from '../../_lib/apiError'
import { requirePermission, resolveDefaultPermissions } from '../../_lib/auth'

const roleSchema = z.enum(['admin', 'gestor', 'visor'])
const statusSchema = z.enum(['active', 'inactive'])
const permissionLevelSchema = z.enum(['none', 'read', 'write', 'admin'])

const permissionsSchema = z.object({
  clients: permissionLevelSchema.default('none'),
  projects: permissionLevelSchema.default('none'),
  tasks: permissionLevelSchema.default('none'),
  quotes: permissionLevelSchema.default('none'),
  finance: permissionLevelSchema.default('none'),
  users: permissionLevelSchema.default('none'),
})

const userSchema = z.object({
  clerkId: z.string().min(3).optional(),
  name: z.string().min(2),
  email: z.string().email(),
  role: roleSchema.default('gestor'),
  status: statusSchema.default('active'),
  permissions: permissionsSchema.optional(),
})

const querySchema = z.object({
  search: z.string().optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional(),
})

const clerkClient = () => {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) throw createError('CLERK_SECRET_KEY no configurado', 500)
  return createClerkClient({ secretKey })
}

const splitName = (name: string) => {
  const [firstName, ...rest] = name.trim().split(/\s+/)
  return { firstName, lastName: rest.join(' ') || undefined }
}

const serializeUser = (user: any) => ({
  id: user._id.toString(),
  clerkId: user.clerkId,
  clerkIds: user.clerkIds || [user.clerkId],
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  active: user.status === 'active',
  permissions: user.permissions || resolveDefaultPermissions(user.role),
  lastLoginAt: user.lastLoginAt,
  createdBy: user.createdBy,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'users', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const url = new URL(req.url)
    const query = querySchema.parse({
      search: url.searchParams.get('search') ?? undefined,
      role: url.searchParams.get('role') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
    })

    await connectToDatabase()

    const filter: Record<string, unknown> = {}
    if (query.role) filter.role = query.role
    if (query.status) filter.status = query.status
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ]
    }

    const users = await AdminModel.find(filter).sort({ updatedAt: -1 }).limit(300)
    return Response.json({ success: true, users: users.map(serializeUser) })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Filtros inválidos', 400)) : toErrorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'users', 'admin')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const payload = userSchema.parse(await req.json())
    await connectToDatabase()

    const email = payload.email.toLowerCase()
    const existing = await AdminModel.findOne({ email })
    if (existing) throw createError('Ya existe un usuario con ese correo', 409)

    const permissions = payload.permissions || resolveDefaultPermissions(payload.role)
    const clerkId = payload.clerkId || (await clerkClient().users.createUser({
      emailAddress: [email],
      ...splitName(payload.name),
      skipPasswordRequirement: true,
      publicMetadata: { role: payload.role, status: payload.status, permissions },
    })).id

    const user = await AdminModel.create({
      clerkId,
      clerkIds: [clerkId],
      name: payload.name,
      email,
      role: payload.role,
      status: payload.status,
      createdBy: authorized.clerkId,
      permissions,
    })

    return Response.json({ success: true, user: serializeUser(user) }, { status: 201 })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Datos de usuario inválidos', 400)) : toErrorResponse(err)
  }
}
