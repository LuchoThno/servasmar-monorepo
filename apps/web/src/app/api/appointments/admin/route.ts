import { NextRequest } from 'next/server'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../api/src/config/db'
import { AppointmentModel } from '../../../../../../api/src/models/Appointment'
import { dateStringToDate } from '../../../../../../api/src/utils/dates'
import { createError, toErrorResponse } from '../../_lib/apiError'
import { requirePermission } from '../../_lib/auth'

const listQuerySchema = z.object({
  status: z.enum(['pendiente', 'aprobada', 'rechazada', 'cancelada']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'tasks', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const url = new URL(req.url)
    const query = listQuerySchema.parse({
      status: url.searchParams.get('status') ?? undefined,
      date: url.searchParams.get('date') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
    })

    await connectToDatabase()

    const filter: Record<string, unknown> = {}
    if (query.status) filter.estado = query.status
    if (query.date) filter.fechaSolicitada = dateStringToDate(query.date)
    if (query.search) {
      filter.$or = [
        { nombre: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { empresa: { $regex: query.search, $options: 'i' } },
      ]
    }

    const appointments = await AppointmentModel.find(filter).sort({ createdAt: -1 }).limit(200)
    return Response.json({ success: true, appointments })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Filtros inválidos', 400)) : toErrorResponse(err)
  }
}
