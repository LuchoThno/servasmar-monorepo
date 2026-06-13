import { createClerkClient } from '@clerk/backend'
import { NextFunction, Request, Response, Router } from 'express'
import { z } from 'zod'
import { connectToDatabase } from '../config/db'
import { AuthenticatedRequest, clearAdminCache, requireAdmin, requirePermission } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { AdminModel } from '../models/Admin'

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
  users: permissionLevelSchema.default('none'),
})

type AdminRole = z.infer<typeof roleSchema>
type PermissionLevel = z.infer<typeof permissionLevelSchema>

const rolePermissions: Record<AdminRole, Record<string, PermissionLevel>> = {
  admin: { clients: 'admin', projects: 'admin', tasks: 'admin', quotes: 'admin', users: 'admin' },
  gestor: { clients: 'write', projects: 'write', tasks: 'write', quotes: 'write', users: 'none' },
  visor: { clients: 'read', projects: 'read', tasks: 'read', quotes: 'read', users: 'none' },
}

const resolvePermissions = (role: AdminRole, permissions?: z.infer<typeof permissionsSchema>) =>
  permissions || rolePermissions[role]

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
  permissions: user.permissions || rolePermissions[user.role as AdminRole],
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
    res.json({ success: true, users: users.map(serializeUser) })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Filtros inválidos', 400) : error)
  }
})

router.post('/admin', requirePermission('users', 'admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payload = userSchema.parse(req.body)
    await connectToDatabase()

    const email = payload.email.toLowerCase()
    const existing = await AdminModel.findOne({ email })
    if (existing) throw createError('Ya existe un usuario con ese correo', 409)

    const permissions = resolvePermissions(payload.role, payload.permissions)
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
      createdBy: req.admin?.clerkId || '',
      permissions,
    })

    res.status(201).json({ success: true, user: serializeUser(user) })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Datos de usuario inválidos', 400) : error)
  }
})

router.put('/admin/:id', requirePermission('users', 'admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payload = userSchema.parse(req.body)
    await connectToDatabase()

    const email = payload.email.toLowerCase()
    const existingEmail = await AdminModel.findOne({ email, _id: { $ne: req.params.id } })
    if (existingEmail) throw createError('Ya existe un usuario con ese correo', 409)

    const permissions = resolvePermissions(payload.role, payload.permissions)
    const current = await AdminModel.findById(req.params.id)
    if (!current) throw createError('Usuario no encontrado', 404)

    const user = await AdminModel.findByIdAndUpdate(
      req.params.id,
      {
        clerkId: payload.clerkId || current.clerkId,
        clerkIds: Array.from(new Set([...(current.clerkIds || []), payload.clerkId || current.clerkId])),
        name: payload.name,
        email,
        role: payload.role,
        status: payload.status,
        permissions,
      },
      { new: true }
    )
    if (!user) throw createError('Usuario no encontrado', 404)

    await clerkClient().users.updateUser(user.clerkId, {
      ...splitName(payload.name),
      publicMetadata: { role: payload.role, status: payload.status, permissions },
    })
    clearAdminCache(user.clerkId)

    res.json({ success: true, user: serializeUser(user) })
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

    await clerkClient().users.deleteUser(user.clerkId)
    clearAdminCache(user.clerkId)
    await user.deleteOne()
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
