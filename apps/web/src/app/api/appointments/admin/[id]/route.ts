import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { AppointmentModel } from '../../../../../../../api/src/models/Appointment'
import { createError, toErrorResponse } from '../../../_lib/apiError'
import { requirePermission } from '../../../_lib/auth'

const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params

  try {
    const authorized = await requirePermission(req, 'tasks', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const id = idSchema.parse(params.id)
    await connectToDatabase()
    const appointment = await AppointmentModel.findById(id)
    if (!appointment) throw createError('Cita no encontrada', 404)

    return Response.json({ success: true, appointment })
  } catch (err) {
    return toErrorResponse(err)
  }
}
