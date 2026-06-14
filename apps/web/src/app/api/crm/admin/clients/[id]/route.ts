import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectToDatabase } from '../../../../../../../../api/src/config/db'





import { requirePermission } from '../../../../_lib/auth'
import { toErrorResponse } from '../../../../_lib/apiError'

import { CrmClientModel } from '../../../../../../../../api/src/models/CrmClient'
import { CrmProjectModel } from '../../../../../../../../api/src/models/CrmProject'
import { CrmQuoteModel } from '../../../../../../../../api/src/models/CrmQuote'



const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')

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

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params

  try {
    const authorized = await requirePermission(req, 'clients', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const id = idSchema.parse(params.id)
    const payload = clientSchema.parse(await req.json())

    await connectToDatabase()
    const client = await CrmClientModel.findByIdAndUpdate(id, payload, { new: true })
    if (!client) return Response.json({ success: false, error: { message: 'Cliente no encontrado' } }, { status: 404 })

    return Response.json({ success: true, client })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params

  try {
    const authorized = await requirePermission(req, 'clients', 'admin')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const id = idSchema.parse(params.id)
    await connectToDatabase()

    const client = await CrmClientModel.findByIdAndDelete(id)
    if (!client) return Response.json({ success: false, error: { message: 'Cliente no encontrado' } }, { status: 404 })

    await CrmProjectModel.deleteMany({ clientId: id })
    await CrmQuoteModel.deleteMany({ clientId: id })

    return Response.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
