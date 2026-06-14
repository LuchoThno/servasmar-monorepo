import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../../api/src/config/db'

import { requirePermission } from '../../../_lib/auth'
import { toErrorResponse } from '../../../_lib/apiError'

import { CrmQuoteModel } from '../../../../../../../api/src/models/CrmQuote'

import { CrmClientModel } from '../../../../../../../api/src/models/CrmClient'
import { CrmProjectModel } from '../../../../../../../api/src/models/CrmProject'

const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')

const searchSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  clientId: z.string().optional(),
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

const getNextQuoteNumber = async () => {
  const lastQuote = await CrmQuoteModel.findOne({ number: /^COT-\\d+$/ }).sort({ number: -1 }).select('number')
  const lastNumber = Number(lastQuote?.number?.replace('COT-', '') || 0)
  return `COT-${String(lastNumber + 1).padStart(5, '0')}`
}

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
    number: quoteId ? undefined : await getNextQuoteNumber(),
    projectId: payload.projectId || undefined,
    issuedAt: emptyToDate(payload.issuedAt) || new Date(),
    validUntil: emptyToDate(payload.validUntil),
  }
}


export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'quotes', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const url = new URL(req.url)
    const query = {
      search: url.searchParams.get('search') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      clientId: url.searchParams.get('clientId') ?? undefined,
    }

    const parsed = searchSchema.parse(query)

    await connectToDatabase()

    const filter: Record<string, unknown> = {}
    if (parsed.status) filter.status = parsed.status
    if (parsed.clientId && Types.ObjectId.isValid(parsed.clientId)) filter.clientId = parsed.clientId

    if (parsed.search) {
      filter.$or = [
        { number: { $regex: parsed.search, $options: 'i' } },
        { title: { $regex: parsed.search, $options: 'i' } },
        { notes: { $regex: parsed.search, $options: 'i' } },
      ]
    }

    const quotes = await CrmQuoteModel.find(filter)
      .populate('clientId', 'name taxId email phone address contacts')
      .populate('projectId', 'name status')
      .sort({ updatedAt: -1 })
      .limit(300)

    return Response.json({ success: true, quotes })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'quotes', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const body = await req.json()
    const payload = quoteSchema.parse(body)

    await connectToDatabase()

    const normalized = await normalizeQuotePayload(payload)
    const quote = await CrmQuoteModel.create(normalized)

    await quote.populate('clientId', 'name taxId email phone address contacts')
    await quote.populate('projectId', 'name status')

    return Response.json({ success: true, quote }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}

