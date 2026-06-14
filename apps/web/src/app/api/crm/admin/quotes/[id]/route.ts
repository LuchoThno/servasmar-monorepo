import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../../../api/src/config/db'

import { requirePermission } from '../../../../_lib/auth'
import { toErrorResponse } from '../../../../_lib/apiError'

import { CrmClientModel } from '../../../../../../../../api/src/models/CrmClient'
import { CrmQuoteModel } from '../../../../../../../../api/src/models/CrmQuote'
import { CrmProjectModel } from '../../../../../../../../api/src/models/CrmProject'

const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')

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
  status: z
    .enum(['borrador', 'enviada', 'aprobada', 'rechazada', 'vencida'])
    .default('borrador'),
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

const normalizeQuotePayload = async (payload: z.infer<typeof quoteSchema>, quoteId?: string) => {
  const client = await CrmClientModel.findById(payload.clientId)
  if (!client) {
    const e: any = new Error('Cliente asociado no encontrado')
    e.statusCode = 404
    throw e
  }

  if (payload.projectId) {
    const project = await CrmProjectModel.findOne({ _id: payload.projectId, clientId: payload.clientId })
    if (!project) {
      const e: any = new Error('Proyecto asociado no encontrado para este cliente')
      e.statusCode = 404
      throw e
    }
  }

  return {
    ...payload,
    number: quoteId ? undefined : undefined,
    projectId: payload.projectId || undefined,
    issuedAt: emptyToDate(payload.issuedAt) || new Date(),
    validUntil: emptyToDate(payload.validUntil),
  }
}


export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'quotes', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = idSchema.parse(params.id)

    await connectToDatabase()

    const quote = await CrmQuoteModel.findById(id)
      .populate('clientId', 'name taxId email phone address contacts')
      .populate('projectId', 'name status')

    if (!quote) return Response.json({ success: false, error: { message: 'Cotización no encontrada' } }, { status: 404 })

    return Response.json({ success: true, quote })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'quotes', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = idSchema.parse(params.id)

    const payload = quoteSchema.parse(await req.json())

    await connectToDatabase()

    const normalized = await normalizeQuotePayload(payload, id)
    const update: any = { ...normalized }
    delete update.number

    const quote = await CrmQuoteModel.findByIdAndUpdate(id, update, { new: true })
      .populate('clientId', 'name taxId email phone address contacts')
      .populate('projectId', 'name status')

    if (!quote) return Response.json({ success: false, error: { message: 'Cotización no encontrada' } }, { status: 404 })

    return Response.json({ success: true, quote })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'quotes', 'admin')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = idSchema.parse(params.id)

    await connectToDatabase()

    const quote = await CrmQuoteModel.findByIdAndDelete(id)
    if (!quote) return Response.json({ success: false, error: { message: 'Cotización no encontrada' } }, { status: 404 })

    return Response.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
