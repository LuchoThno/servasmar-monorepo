import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectToDatabase } from '../../../../../../../api/src/config/db'

import { requirePermission } from '../../../_lib/auth'
import { toErrorResponse } from '../../../_lib/apiError'
import { CrmClientModel } from '../../../../../../../api/src/models/CrmClient'


const searchSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  clientId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'clients', 'read')
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

    if (parsed.search) {
      filter.$or = [
        { name: { $regex: parsed.search, $options: 'i' } },
        { taxId: { $regex: parsed.search, $options: 'i' } },
        { email: { $regex: parsed.search, $options: 'i' } },
        { 'contacts.name': { $regex: parsed.search, $options: 'i' } },
      ]
    }

    const clients = await CrmClientModel.find(filter).sort({ updatedAt: -1 }).limit(300)
    return Response.json({ success: true, clients })
  } catch (err) {
    return toErrorResponse(err)
  }
}

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

export async function POST(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'clients', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const body = await req.json()
    const payload = clientSchema.parse(body)

    await connectToDatabase()
    const client = await CrmClientModel.create(payload)

    return Response.json({ success: true, client }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}

