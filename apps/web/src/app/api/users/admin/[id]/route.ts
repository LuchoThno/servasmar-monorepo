import { createClerkClient } from '@clerk/backend'
import { NextRequest } from 'next/server'
import {
  buildAdminUserResendInvitationUpdate,
  buildAdminUserUpdateInput,
  canResendInvitation,
  hasClerkIdentity,
  resolveDefaultPermissions,
  resolveProvisioningStatus,
  type AdminProvisioningStatus,
  type AdminRole,
} from '@servasmar/utils'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { AdminModel, type AdminDocument } from '../../../../../../../api/src/models/Admin'
import { createError, toErrorResponse } from '../../../_lib/apiError'
import { requirePermission } from '../../../_lib/auth'

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

const splitName = (name: string) => {
  const [firstName, ...rest] = name.trim().split(/\s+/)
  return { firstName, lastName: rest.join(' ') || undefined }
}

type AdminRecord = AdminDocument & {
  _id: { toString(): string }
}

const toProvisioningErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'No pudimos sincronizar el usuario con Clerk')

const sendInvitation = async ({
  email,
  role,
  status,
  permissions,
}: {
  email: string
  role: z.infer<typeof roleSchema>
  status: z.infer<typeof statusSchema>
  permissions: z.infer<typeof permissionsSchema>
}) => {
  await clerkClient().invitations.createInvitation({
    emailAddress: email,
    ignoreExisting: true,
    notify: true,
    publicMetadata: { role, status, permissions },
  })
}

const serializeUser = (user: AdminRecord) => ({
  id: user._id.toString(),
  clerkId: user.clerkId,
  clerkIds: user.clerkIds || [user.clerkId],
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  provisioningStatus: resolveProvisioningStatus({
    clerkId: user.clerkId,
    provisioningStatus: user.provisioningStatus as AdminProvisioningStatus | undefined,
  }),
  provisioningError: user.provisioningError,
  invitationSentAt: user.invitationSentAt,
  activatedAt: user.activatedAt,
  active: user.status === 'active',
  permissions: user.permissions || resolveDefaultPermissions(user.role as AdminRole),
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
    const current = await AdminModel.findById(params.id)
    if (!current) throw createError('Usuario no encontrado', 404)

    const updateInput = buildAdminUserUpdateInput({
      current,
      payload,
    })

    const email = updateInput.email

    const existingEmail = await AdminModel.findOne({ email, _id: { $ne: params.id } })
    if (existingEmail) throw createError('Ya existe un usuario con ese correo', 409)

    let user = await AdminModel.findByIdAndUpdate(
      params.id,
      updateInput.update,
      { new: true }
    )
    if (!user) throw createError('Usuario no encontrado', 404)

    let warning: string | undefined

    if (updateInput.shouldSyncClerk) {
      try {
        await clerkClient().users.updateUser(user.clerkId, {
          ...splitName(payload.name),
          publicMetadata: { role: payload.role, status: payload.status, permissions: updateInput.permissions },
        })
        user = (await AdminModel.findByIdAndUpdate(
          params.id,
          {
            $set: {
              provisioningStatus: 'active',
              provisioningError: undefined,
              activatedAt: user.activatedAt || new Date(),
            },
          },
          { new: true }
        )) || user
      } catch (error) {
        warning = toProvisioningErrorMessage(error)
        user = (await AdminModel.findByIdAndUpdate(
          params.id,
          {
            $set: {
              provisioningStatus: 'sync_error',
              provisioningError: warning,
            },
          },
          { new: true }
        )) || user
      }
    }

    return Response.json({ success: true, user: serializeUser(user), ...(warning ? { warning } : {}) }, { status: warning ? 202 : 200 })
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

    if (hasClerkIdentity({ clerkId: user.clerkId, clerkIds: user.clerkIds, provisioningStatus: user.provisioningStatus as AdminProvisioningStatus | undefined })) {
      await clerkClient().users.deleteUser(user.clerkId)
    }
    await user.deleteOne()

    return Response.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params

  try {
    const authorized = await requirePermission(req, 'users', 'admin')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    await connectToDatabase()
    const user = await AdminModel.findById(params.id)
    if (!user) throw createError('Usuario no encontrado', 404)

    const provisioningStatus = resolveProvisioningStatus({
      clerkId: user.clerkId,
      provisioningStatus: user.provisioningStatus as AdminProvisioningStatus | undefined,
    })

    if (!canResendInvitation(provisioningStatus)) {
      throw createError('Este usuario ya está sincronizado con Clerk', 409)
    }

    const permissions = user.permissions || resolveDefaultPermissions(user.role as AdminRole)

    try {
      await sendInvitation({
        email: user.email,
        role: user.role as z.infer<typeof roleSchema>,
        status: user.status as z.infer<typeof statusSchema>,
        permissions,
      })

      const updated = await AdminModel.findByIdAndUpdate(params.id, buildAdminUserResendInvitationUpdate({ user }), { new: true })
      if (!updated) throw createError('Usuario no encontrado', 404)

      return Response.json({ success: true, user: serializeUser(updated), invited: true })
    } catch (error) {
      const warning = toProvisioningErrorMessage(error)
      const updated = await AdminModel.findByIdAndUpdate(
        params.id,
        {
          $set: {
            provisioningStatus: 'sync_error',
            provisioningError: warning,
          },
        },
        { new: true }
      )
      if (!updated) throw createError('Usuario no encontrado', 404)

      return Response.json({ success: true, user: serializeUser(updated), invited: false, warning }, { status: 202 })
    }
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Solicitud inválida', 400)) : toErrorResponse(err)
  }
}
