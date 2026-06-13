import { NextFunction, Request, Response, Router } from 'express'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectToDatabase } from '../config/db'
import { requireAdmin } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { CrmClientModel } from '../models/CrmClient'
import { CrmProjectModel } from '../models/CrmProject'
import { CrmQuoteModel } from '../models/CrmQuote'

const router = Router()

router.use('/admin', requireAdmin)

const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')

const searchSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  clientId: z.string().optional(),
})

const contactSchema = z.object({
  name: z.string().min(2),
  role: z.string().optional().default(''),
  email: z.string().email().or(z.literal('')).optional().default(''),
  phone: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

const clientSchema = z.object({
  name: z.string().min(2),
  taxId: z.string().optional().default(''),
  industry: z.string().optional().default(''),
  status: z.enum(['prospecto', 'activo', 'inactivo']).default('prospecto'),
  email: z.string().email().or(z.literal('')).optional().default(''),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  contacts: z.array(contactSchema).default([]),
})

const projectValueSchema = z.object({
  label: z.string().min(2),
  amount: z.coerce.number().min(0),
  currency: z.string().optional().default('CLP'),
  type: z.enum(['ingreso', 'egreso']).default('ingreso'),
  dueDate: z.string().optional().default(''),
  status: z.enum(['pendiente', 'facturado', 'pagado']).default('pendiente'),
  notes: z.string().optional().default(''),
})

const projectTaskSchema = z.object({
  title: z.string().min(2),
  owner: z.string().optional().default(''),
  dueDate: z.string().optional().default(''),
  status: z.enum(['pendiente', 'en_progreso', 'completada', 'bloqueada']).default('pendiente'),
  notes: z.string().optional().default(''),
})

const projectSchema = z.object({
  clientId: idSchema,
  name: z.string().min(2),
  serviceType: z.string().optional().default(''),
  status: z.enum(['prospecto', 'en_progreso', 'pausado', 'cerrado', 'perdido']).default('prospecto'),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  description: z.string().optional().default(''),
  values: z.array(projectValueSchema).default([]),
  tasks: z.array(projectTaskSchema).default([]),
})

const quoteItemSchema = z.object({
  description: z.string().min(2),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  currency: z.string().optional().default('CLP'),
})

const quoteSchema = z.object({
  clientId: idSchema,
  projectId: idSchema.or(z.literal('')).optional().default(''),
  title: z.string().min(2),
  status: z.enum(['borrador', 'enviada', 'aprobada', 'rechazada', 'vencida']).default('borrador'),
  issuedAt: z.string().optional().default(''),
  validUntil: z.string().optional().default(''),
  discountType: z.enum(['none', 'amount', 'percent']).default('none'),
  discountValue: z.coerce.number().min(0).default(0),
  applyVat: z.boolean().default(true),
  vatRate: z.coerce.number().min(0).default(19),
  notes: z.string().optional().default(''),
  specialClauses: z.string().optional().default(''),
  items: z.array(quoteItemSchema).min(1),
})

const emptyToDate = (value?: string) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined)

const normalizeProjectPayload = (payload: z.infer<typeof projectSchema>) => ({
  ...payload,
  startDate: emptyToDate(payload.startDate),
  endDate: emptyToDate(payload.endDate),
  values: payload.values.map((value) => ({
    ...value,
    dueDate: emptyToDate(value.dueDate),
  })),
  tasks: payload.tasks.map((task) => ({
    ...task,
    dueDate: emptyToDate(task.dueDate),
  })),
})

const normalizeQuotePayload = async (payload: z.infer<typeof quoteSchema>, quoteId?: string) => {
  const client = await CrmClientModel.findById(payload.clientId)
  if (!client) throw createError('Cliente asociado no encontrado', 404)

  if (payload.projectId) {
    const project = await CrmProjectModel.findOne({ _id: payload.projectId, clientId: payload.clientId })
    if (!project) throw createError('Proyecto asociado no encontrado para este cliente', 404)
  }

  const existingCount = quoteId ? 0 : await CrmQuoteModel.countDocuments()
  return {
    ...payload,
    number: quoteId ? undefined : `COT-${String(existingCount + 1).padStart(5, '0')}`,
    projectId: payload.projectId || undefined,
    issuedAt: emptyToDate(payload.issuedAt) || new Date(),
    validUntil: emptyToDate(payload.validUntil),
  }
}

router.get('/admin/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectToDatabase()
    const [clients, activeClients, projects, openProjects] = await Promise.all([
      CrmClientModel.countDocuments(),
      CrmClientModel.countDocuments({ status: 'activo' }),
      CrmProjectModel.countDocuments(),
      CrmProjectModel.countDocuments({ status: { $in: ['prospecto', 'en_progreso', 'pausado'] } }),
    ])

    const finance = await CrmProjectModel.aggregate([
      { $unwind: { path: '$values', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { currency: '$values.currency', type: { $ifNull: ['$values.type', 'ingreso'] } },
          total: { $sum: '$values.amount' },
        },
      },
      { $sort: { _id: 1 } },
    ])

    const taskKpis = await CrmProjectModel.aggregate([
      { $unwind: { path: '$tasks', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$tasks.status', total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    res.json({ success: true, summary: { clients, activeClients, projects, openProjects, finance, taskKpis } })
  } catch (error) {
    next(error)
  }
})

router.get('/admin/clients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = searchSchema.parse(req.query)
    await connectToDatabase()

    const filter: Record<string, unknown> = {}
    if (query.status) filter.status = query.status
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { taxId: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { 'contacts.name': { $regex: query.search, $options: 'i' } },
      ]
    }

    const clients = await CrmClientModel.find(filter).sort({ updatedAt: -1 }).limit(300)
    res.json({ success: true, clients })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Filtros inválidos', 400) : error)
  }
})

router.post('/admin/clients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = clientSchema.parse(req.body)
    await connectToDatabase()
    const client = await CrmClientModel.create(payload)
    res.status(201).json({ success: true, client })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Datos de cliente inválidos', 400) : error)
  }
})

router.put('/admin/clients/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(req.params.id)
    const payload = clientSchema.parse(req.body)
    await connectToDatabase()
    const client = await CrmClientModel.findByIdAndUpdate(id, payload, { new: true })
    if (!client) throw createError('Cliente no encontrado', 404)
    res.json({ success: true, client })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Datos de cliente inválidos', 400) : error)
  }
})

router.delete('/admin/clients/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(req.params.id)
    await connectToDatabase()
    const client = await CrmClientModel.findByIdAndDelete(id)
    if (!client) throw createError('Cliente no encontrado', 404)
    await CrmProjectModel.deleteMany({ clientId: id })
    await CrmQuoteModel.deleteMany({ clientId: id })
    res.json({ success: true })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('ID de cliente inválido', 400) : error)
  }
})

router.get('/admin/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = searchSchema.parse(req.query)
    await connectToDatabase()

    const filter: Record<string, unknown> = {}
    if (query.status) filter.status = query.status
    if (query.clientId && Types.ObjectId.isValid(query.clientId)) filter.clientId = query.clientId
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { serviceType: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ]
    }

    const projects = await CrmProjectModel.find(filter)
      .populate('clientId', 'name taxId email')
      .sort({ updatedAt: -1 })
      .limit(300)
    res.json({ success: true, projects })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Filtros inválidos', 400) : error)
  }
})

router.post('/admin/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = projectSchema.parse(req.body)
    await connectToDatabase()
    const client = await CrmClientModel.findById(payload.clientId)
    if (!client) throw createError('Cliente asociado no encontrado', 404)
    const project = await CrmProjectModel.create(normalizeProjectPayload(payload))
    await project.populate('clientId', 'name taxId email')
    res.status(201).json({ success: true, project })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Datos de proyecto inválidos', 400) : error)
  }
})

router.put('/admin/projects/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(req.params.id)
    const payload = projectSchema.parse(req.body)
    await connectToDatabase()
    const client = await CrmClientModel.findById(payload.clientId)
    if (!client) throw createError('Cliente asociado no encontrado', 404)
    const project = await CrmProjectModel.findByIdAndUpdate(id, normalizeProjectPayload(payload), { new: true })
      .populate('clientId', 'name taxId email')
    if (!project) throw createError('Proyecto no encontrado', 404)
    res.json({ success: true, project })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Datos de proyecto inválidos', 400) : error)
  }
})

router.delete('/admin/projects/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(req.params.id)
    await connectToDatabase()
    const project = await CrmProjectModel.findByIdAndDelete(id)
    if (!project) throw createError('Proyecto no encontrado', 404)
    await CrmQuoteModel.updateMany({ projectId: id }, { $unset: { projectId: '' } })
    res.json({ success: true })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('ID de proyecto inválido', 400) : error)
  }
})

router.get('/admin/quotes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = searchSchema.parse(req.query)
    await connectToDatabase()
    const filter: Record<string, unknown> = {}
    if (query.status) filter.status = query.status
    if (query.clientId && Types.ObjectId.isValid(query.clientId)) filter.clientId = query.clientId
    if (query.search) {
      filter.$or = [
        { number: { $regex: query.search, $options: 'i' } },
        { title: { $regex: query.search, $options: 'i' } },
        { notes: { $regex: query.search, $options: 'i' } },
      ]
    }

    const quotes = await CrmQuoteModel.find(filter)
      .populate('clientId', 'name taxId email phone address contacts')
      .populate('projectId', 'name status')
      .sort({ updatedAt: -1 })
      .limit(300)

    res.json({ success: true, quotes })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Filtros inválidos', 400) : error)
  }
})

router.get('/admin/quotes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(req.params.id)
    await connectToDatabase()
    const quote = await CrmQuoteModel.findById(id)
      .populate('clientId', 'name taxId email phone address contacts')
      .populate('projectId', 'name status')
    if (!quote) throw createError('Cotización no encontrada', 404)
    res.json({ success: true, quote })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('ID de cotización inválido', 400) : error)
  }
})

router.post('/admin/quotes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = quoteSchema.parse(req.body)
    await connectToDatabase()
    const normalized = await normalizeQuotePayload(payload)
    const quote = await CrmQuoteModel.create(normalized)
    await quote.populate('clientId', 'name taxId email phone address contacts')
    await quote.populate('projectId', 'name status')
    res.status(201).json({ success: true, quote })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Datos de cotización inválidos', 400) : error)
  }
})

router.put('/admin/quotes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(req.params.id)
    const payload = quoteSchema.parse(req.body)
    await connectToDatabase()
    const normalized = await normalizeQuotePayload(payload, id)
    const quote = await CrmQuoteModel.findByIdAndUpdate(id, { ...normalized, number: undefined }, { new: true })
      .populate('clientId', 'name taxId email phone address contacts')
      .populate('projectId', 'name status')
    if (!quote) throw createError('Cotización no encontrada', 404)
    res.json({ success: true, quote })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Datos de cotización inválidos', 400) : error)
  }
})

router.delete('/admin/quotes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(req.params.id)
    await connectToDatabase()
    const quote = await CrmQuoteModel.findByIdAndDelete(id)
    if (!quote) throw createError('Cotización no encontrada', 404)
    res.json({ success: true })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('ID de cotización inválido', 400) : error)
  }
})

export default router
