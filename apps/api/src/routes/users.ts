import { createClerkClient } from '@clerk/backend'
import { NextFunction, Request, Response, Router } from 'express'
import {
  buildAdminUserCreateInput,
  buildAdminUserListFilter,
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
import { connectToDatabase } from '../config/db'
import { AuthenticatedRequest, clearAdminCache, requireAdmin, requirePermission } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { AdminModel, type AdminDocument } from '../models/Admin'

const router = Router()

router.use('/admin', requireAdmin)

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

const splitName = (name: string) => {
  const [firstName, ...rest] = name.trim().split(/\s+/)
  return { firstName, lastName: rest.join(' ') || undefined }
}

type AdminRecord = AdminDocument & {
  _id: { toString(): string }
}

const toProvisioningErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'No pudimos sincronizar la invitación con Clerk')

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

router.get('/admin/me', async (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, user: req.admin })
})

router.get('/admin', requirePermission('users', 'read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = querySchema.parse(req.query)
    await connectToDatabase()

    const filter = buildAdminUserListFilter(query)

    const users = await AdminModel.find(filter).sort({ updatedAt: -1 }).limit(300)
    res.json({ success: true, users: users.map(serializeUser) })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Filtros inválidos', 400) : error)
  }
})

router.post('/admin', requirePermission('users', 'admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payload = userSchema.parse(req.body)
    await connectToDatabase()

    const createInput = buildAdminUserCreateInput({
      payload,
      createdBy: req.admin?.clerkId || '',
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

    res.status(warning ? 202 : 201).json({ success: true, user: serializeUser(user), invited, ...(warning ? { warning } : {}) })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Datos de usuario inválidos', 400) : error)
  }
})

router.put('/admin/:id', requirePermission('users', 'admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payload = userSchema.parse(req.body)
    await connectToDatabase()

    const current = await AdminModel.findById(req.params.id)
    if (!current) throw createError('Usuario no encontrado', 404)
    const updateInput = buildAdminUserUpdateInput({
      current,
      payload,
    })
    const email = updateInput.email
    const existingEmail = await AdminModel.findOne({ email, _id: { $ne: req.params.id } })
    if (existingEmail) throw createError('Ya existe un usuario con ese correo', 409)

    let user = await AdminModel.findByIdAndUpdate(
      req.params.id,
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
        clearAdminCache(user.clerkId)
        user = (await AdminModel.findByIdAndUpdate(
          req.params.id,
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
          req.params.id,
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

    res.status(warning ? 202 : 200).json({ success: true, user: serializeUser(user), ...(warning ? { warning } : {}) })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Datos de usuario inválidos', 400) : error)
  }
})

router.delete('/admin/:id', requirePermission('users', 'admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await connectToDatabase()
    const user = await AdminModel.findById(req.params.id)
    if (!user) throw createError('Usuario no encontrado', 404)
    if (req.admin?.clerkId === user.clerkId) {
      throw createError('No puedes eliminar tu propio usuario', 409)
    }

    if (hasClerkIdentity({ clerkId: user.clerkId, clerkIds: user.clerkIds, provisioningStatus: user.provisioningStatus as AdminProvisioningStatus | undefined })) {
      await clerkClient().users.deleteUser(user.clerkId)
      clearAdminCache(user.clerkId)
    }
    await user.deleteOne()
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

router.post('/admin/:id/resend-invitation', requirePermission('users', 'admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await connectToDatabase()
    const user = await AdminModel.findById(req.params.id)
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

      const updated = await AdminModel.findByIdAndUpdate(req.params.id, buildAdminUserResendInvitationUpdate({ user }), { new: true })
      if (!updated) throw createError('Usuario no encontrado', 404)

      res.json({ success: true, user: serializeUser(updated), invited: true })
    } catch (error) {
      const warning = toProvisioningErrorMessage(error)
      const updated = await AdminModel.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            provisioningStatus: 'sync_error',
            provisioningError: warning,
          },
        },
        { new: true }
      )
      if (!updated) throw createError('Usuario no encontrado', 404)

      res.status(202).json({ success: true, user: serializeUser(updated), invited: false, warning })
    }
  } catch (error) {
    next(error)
  }
})

export default router
