import { NextRequest } from 'next/server'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../api/src/config/db'
import { AppointmentModel } from '../../../../../../api/src/models/Appointment'
import { assertSlotAvailable } from '../../../../../../api/src/services/availability'
import { dateStringToDate } from '../../../../../../api/src/utils/dates'
import { resolveLinkedClientsForAppointment } from '@/lib/appointmentClients'
import { createError, toErrorResponse } from '../../_lib/apiError'
import { requirePermission } from '../../_lib/auth'

const listQuerySchema = z.object({
  status: z.enum(['pendiente', 'aprobada', 'rechazada', 'cancelada']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
})

const appointmentSchema = z.object({
  nombre: z.string().min(2),
  empresa: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().min(6),
  motivo: z.string().min(5),
  fechaSolicitada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaSolicitada: z.string().regex(/^\d{2}:\d{2}$/),
  observaciones: z.string().optional().default(''),
  linkedClientIds: z.array(z.string()).optional().default([]),
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

    const appointments = await AppointmentModel.find(filter)
      .populate('linkedClientIds', 'name email contacts')
      .sort({ createdAt: -1 })
      .limit(200)
    return Response.json({ success: true, appointments })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Filtros inválidos', 400)) : toErrorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'tasks', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const payload = appointmentSchema.parse(await req.json())
    await connectToDatabase()

    const isAvailable = await assertSlotAvailable(payload.fechaSolicitada, payload.horaSolicitada)
    if (!isAvailable) throw createError('El horario seleccionado ya no está disponible', 409)

    const linkedClients = await resolveLinkedClientsForAppointment({
      email: payload.email,
      empresa: payload.empresa,
      linkedClientIds: payload.linkedClientIds,
    })

    const appointment = await AppointmentModel.create({
      ...payload,
      fechaSolicitada: dateStringToDate(payload.fechaSolicitada),
      estado: 'pendiente',
      linkedClientIds: linkedClients.map((client) => client._id),
      source: 'admin',
    })

    const populated = await AppointmentModel.findById(appointment._id).populate('linkedClientIds', 'name email contacts')
    return Response.json({ success: true, appointment: populated || appointment }, { status: 201 })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Datos de cita inválidos', 400)) : toErrorResponse(err)
  }
}
