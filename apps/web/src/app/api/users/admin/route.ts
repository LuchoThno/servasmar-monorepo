import { createClerkClient } from '@clerk/backend'
import { NextRequest } from 'next/server'
import {
  buildAdminUserCreateInput,
  buildAdminUserListFilter,
  resolveDefaultPermissions,
  resolveProvisioningStatus,
  type AdminProvisioningStatus,
  type AdminRole,
} from '@servasmar/utils'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../api/src/config/db'
import { AdminModel, type AdminDocument } from '../../../../../../api/src/models/Admin'
import { createError, toErrorResponse } from '../../_lib/apiError'
import { requirePermission } from '../../_lib/auth'

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
  provisioningStatus: z.enum(['pending_invitation', 'active', 'sync_error']).optional(),
})

const clerkClient = () => {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) throw createError('CLERK_SECRET_KEY no configurado', 500)
  return createClerkClient({ secretKey })
}

type AdminRecord = AdminDocument & {
  _id: { toString(): string }
}

const toProvisioningErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'No pudimos sincronizar la invitación con Clerk')

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

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'users', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const url = new URL(req.url)
    const query = querySchema.parse({
      search: url.searchParams.get('search') ?? undefined,
      role: url.searchParams.get('role') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      provisioningStatus: url.searchParams.get('provisioningStatus') ?? undefined,
    })

    await connectToDatabase()
    const filter = buildAdminUserListFilter(query)

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

    const createInput = buildAdminUserCreateInput({
      payload,
      createdBy: authorized.clerkId,
    })
    const email = createInput.email
    const existing = await AdminModel.findOne({ email })
    if (existing) throw createError('Ya existe un usuario con ese correo', 409)

    let user = await AdminModel.create({
      ...createInput.document,
    })

    let invited = false
    let warning: string | undefined

    if (!createInput.requestedClerkId) {
      try {
        await clerkClient().invitations.createInvitation({
          emailAddress: email,
          ignoreExisting: true,
          notify: true,
          publicMetadata: { role: payload.role, status: payload.status, permissions: createInput.permissions },
        })
        invited = true
        user = (await AdminModel.findByIdAndUpdate(
          user._id,
          {
            $set: {
              provisioningStatus: 'pending_invitation',
              provisioningError: undefined,
              invitationSentAt: new Date(),
            },
          },
          { new: true }
        )) || user
      } catch (error) {
        warning = toProvisioningErrorMessage(error)
        user = (await AdminModel.findByIdAndUpdate(
          user._id,
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

    return Response.json(
      { success: true, user: serializeUser(user), invited, ...(warning ? { warning } : {}) },
      { status: warning ? 202 : 201 }
    )
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Datos de usuario inválidos', 400)) : toErrorResponse(err)
  }
}
