import { NextRequest } from 'next/server'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../api/src/config/db'
import { AppointmentModel } from '../../../../../api/src/models/Appointment'
import { assertSlotAvailable } from '../../../../../api/src/services/availability'
import { dateStringToDate } from '../../../../../api/src/utils/dates'
import { resolveLinkedClientsForAppointment } from '@/lib/appointmentClients'
import { enviarCorreoSolicitudRecibida } from '@/lib/email'
import { createError, toErrorResponse } from '../_lib/apiError'
import { enforcePublicRateLimit, verifyTurnstileToken } from '../_lib/publicSecurity'

const appointmentSchema = z.object({
  nombre: z.string().min(2),
  empresa: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().min(6),
  motivo: z.string().min(5),
  fechaSolicitada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaSolicitada: z.string().regex(/^\d{2}:\d{2}$/),
  observaciones: z.string().optional().default(''),
  turnstileToken: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    await enforcePublicRateLimit(req, { scope: 'public-appointments', limit: 4, windowMs: 15 * 60_000 })
    const payload = appointmentSchema.parse(await req.json())
    await verifyTurnstileToken(payload.turnstileToken, req)
    const { turnstileToken: _turnstileToken, ...appointmentPayload } = payload
    await connectToDatabase()

    const isAvailable = await assertSlotAvailable(appointmentPayload.fechaSolicitada, appointmentPayload.horaSolicitada)
    if (!isAvailable) throw createError('El horario seleccionado ya no está disponible', 409)

    const linkedClients = await resolveLinkedClientsForAppointment({
      email: appointmentPayload.email,
      empresa: appointmentPayload.empresa,
    })

    const appointment = await AppointmentModel.create({
      ...appointmentPayload,
      fechaSolicitada: dateStringToDate(appointmentPayload.fechaSolicitada),
      estado: 'pendiente',
      linkedClientIds: linkedClients.map((client) => client._id),
      source: 'publica',
    })

    let emailWarning: string | undefined
    try {
      const result = await enviarCorreoSolicitudRecibida({
        nombre: appointment.nombre,
        email: appointment.email,
      })
      if (result.error) throw new Error(JSON.stringify(result.error))
    } catch (emailError) {
      console.error('Error sending appointment received email:', emailError)
      emailWarning = 'La solicitud fue registrada, pero no se pudo enviar el correo de confirmación.'
    }

    return Response.json({ success: true, appointment, emailWarning }, { status: 201 })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Datos de cita inválidos', 400)) : toErrorResponse(err)
  }
}
