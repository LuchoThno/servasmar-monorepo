import { createClerkClient } from '@clerk/backend'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { AdminModel } from '../../../../../../../api/src/models/Admin'
import { createError, toErrorResponse } from '../../../_lib/apiError'
import { requirePermission, resolveDefaultPermissions } from '../../../_lib/auth'

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

const clerkClient = () => {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) throw createError('CLERK_SECRET_KEY no configurado', 500)
  return createClerkClient({ secretKey })
}

const PENDING_CLERK_PREFIX = 'pending:'

const splitName = (name: string) => {
  const [firstName, ...rest] = name.trim().split(/\s+/)
  return { firstName, lastName: rest.join(' ') || undefined }
}

const makePendingClerkId = (email: string) => `${PENDING_CLERK_PREFIX}${email}`
const isPendingClerkId = (clerkId?: string | null) => !!clerkId?.startsWith(PENDING_CLERK_PREFIX)

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

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params

  try {
    const authorized = await requirePermission(req, 'users', 'admin')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const payload = userSchema.parse(await req.json())
    await connectToDatabase()

    const email = payload.email.toLowerCase()
    const existingEmail = await AdminModel.findOne({ email, _id: { $ne: params.id } })
    if (existingEmail) throw createError('Ya existe un usuario con ese correo', 409)

    const permissions = payload.permissions || resolveDefaultPermissions(payload.role)
    const current = await AdminModel.findById(params.id)
    if (!current) throw createError('Usuario no encontrado', 404)
    const nextClerkId = payload.clerkId?.trim() || (isPendingClerkId(current.clerkId) ? makePendingClerkId(email) : current.clerkId)

    const user = await AdminModel.findByIdAndUpdate(
      params.id,
      {
        clerkId: nextClerkId,
        clerkIds: Array.from(new Set([...(current.clerkIds || []), ...(!isPendingClerkId(nextClerkId) ? [nextClerkId] : [])])),
        name: payload.name,
        email,
        role: payload.role,
        status: payload.status,
        permissions,
      },
      { new: true }
    )
    if (!user) throw createError('Usuario no encontrado', 404)

    if (!isPendingClerkId(user.clerkId)) {
      await clerkClient().users.updateUser(user.clerkId, {
        ...splitName(payload.name),
        publicMetadata: { role: payload.role, status: payload.status, permissions },
      })
    }

    return Response.json({ success: true, user: serializeUser(user) })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Datos de usuario inválidos', 400)) : toErrorResponse(err)
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params

  try {
    const authorized = await requirePermission(req, 'users', 'admin')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    await connectToDatabase()
    const user = await AdminModel.findById(params.id)
    if (!user) throw createError('Usuario no encontrado', 404)
    if (authorized.clerkId === user.clerkId) throw createError('No puedes eliminar tu propio usuario', 409)

    if (!isPendingClerkId(user.clerkId)) {
      await clerkClient().users.deleteUser(user.clerkId)
    }
    await user.deleteOne()

    return Response.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
