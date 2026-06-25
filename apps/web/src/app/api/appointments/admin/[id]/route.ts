import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { AppointmentModel } from '../../../../../../../api/src/models/Appointment'
import { assertSlotAvailable } from '../../../../../../../api/src/services/availability'
import { dateStringToDate } from '../../../../../../../api/src/utils/dates'
import { resolveLinkedClientsForAppointment } from '@/lib/appointmentClients'
import { createError, toErrorResponse } from '../../../_lib/apiError'
import { requirePermission } from '../../../_lib/auth'

const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')
const updateSchema = z.object({
  nombre: z.string().min(2),
  empresa: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().min(6),
  motivo: z.string().min(5),
  fechaSolicitada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaSolicitada: z.string().regex(/^\d{2}:\d{2}$/),
  observaciones: z.string().optional().default(''),
  linkedClientIds: z.array(z.string()).optional().default([]),
  estado: z.enum(['pendiente', 'cancelada']).optional(),
})

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params

  try {
    const authorized = await requirePermission(req, 'tasks', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const id = idSchema.parse(params.id)
    await connectToDatabase()
    const appointment = await AppointmentModel.findById(id).populate('linkedClientIds', 'name email contacts')
    if (!appointment) throw createError('Cita no encontrada', 404)

    return Response.json({ success: true, appointment })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params

  try {
    const authorized = await requirePermission(req, 'tasks', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const id = idSchema.parse(params.id)
    const payload = updateSchema.parse(await req.json())
    await connectToDatabase()

    const appointment = await AppointmentModel.findById(id)
    if (!appointment) throw createError('Cita no encontrada', 404)

    const requestedDate = appointment.fechaSolicitada.toISOString().slice(0, 10)
    const requestedTime = appointment.horaSolicitada
    const dateChanged = payload.fechaSolicitada !== requestedDate
    const timeChanged = payload.horaSolicitada !== requestedTime

    if (appointment.estado === 'aprobada' && (dateChanged || timeChanged)) {
      throw createError('No puedes cambiar fecha u hora solicitada en una cita ya aprobada', 409)
    }

    if (dateChanged || timeChanged) {
      const isAvailable = await assertSlotAvailable(payload.fechaSolicitada, payload.horaSolicitada)
      if (!isAvailable) throw createError('El horario seleccionado ya no está disponible', 409)
    }

    const linkedClients = await resolveLinkedClientsForAppointment({
      email: payload.email,
      empresa: payload.empresa,
      linkedClientIds: payload.linkedClientIds,
    })

    appointment.nombre = payload.nombre
    appointment.empresa = payload.empresa
    appointment.email = payload.email
    appointment.telefono = payload.telefono
    appointment.motivo = payload.motivo
    appointment.observaciones = payload.observaciones || ''
    appointment.fechaSolicitada = dateStringToDate(payload.fechaSolicitada)
    appointment.horaSolicitada = payload.horaSolicitada
    appointment.linkedClientIds = linkedClients.map((client) => new Types.ObjectId(client._id))

    if (payload.estado) {
      appointment.estado = payload.estado
      if (payload.estado === 'pendiente') {
        appointment.motivoRechazo = ''
      }
    }

    await appointment.save()

    const populated = await AppointmentModel.findById(id).populate('linkedClientIds', 'name email contacts')
    return Response.json({ success: true, appointment: populated || appointment })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Datos de cita inválidos', 400)) : toErrorResponse(err)
  }
}
