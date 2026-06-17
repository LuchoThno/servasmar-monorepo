import { NextRequest } from 'next/server'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../api/src/config/db'
import { AppointmentModel } from '../../../../../api/src/models/Appointment'
import { assertSlotAvailable } from '../../../../../api/src/services/availability'
import { dateStringToDate } from '../../../../../api/src/utils/dates'
import { enviarCorreoSolicitudRecibida } from '@/lib/email'
import { createError, toErrorResponse } from '../_lib/apiError'

const appointmentSchema = z.object({
  nombre: z.string().min(2),
  empresa: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().min(6),
  motivo: z.string().min(5),
  fechaSolicitada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaSolicitada: z.string().regex(/^\d{2}:\d{2}$/),
  observaciones: z.string().optional().default(''),
})

export async function POST(req: NextRequest) {
  try {
    const payload = appointmentSchema.parse(await req.json())
    await connectToDatabase()

    const isAvailable = await assertSlotAvailable(payload.fechaSolicitada, payload.horaSolicitada)
    if (!isAvailable) throw createError('El horario seleccionado ya no está disponible', 409)

    const appointment = await AppointmentModel.create({
      ...payload,
      fechaSolicitada: dateStringToDate(payload.fechaSolicitada),
      estado: 'pendiente',
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
