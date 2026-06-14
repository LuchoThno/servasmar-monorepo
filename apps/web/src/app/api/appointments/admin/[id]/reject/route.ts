import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { AppointmentModel } from '../../../../../../../../api/src/models/Appointment'
import { appointmentRejectedTemplate, sendEmail } from '../../../../../../../../api/src/services/email'
import { createError, toErrorResponse } from '../../../../_lib/apiError'
import { requirePermission } from '../../../../_lib/auth'

const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')
const rejectSchema = z.object({
  motivoRechazo: z.string().min(3),
})

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params

  try {
    const authorized = await requirePermission(req, 'tasks', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const id = idSchema.parse(params.id)
    const payload = rejectSchema.parse(await req.json())
    await connectToDatabase()

    const appointment = await AppointmentModel.findById(id)
    if (!appointment) throw createError('Cita no encontrada', 404)

    appointment.estado = 'rechazada'
    appointment.motivoRechazo = payload.motivoRechazo
    await appointment.save()

    let emailWarning: string | undefined
    try {
      await sendEmail({
        to: appointment.email,
        subject: 'Solicitud de reunión no confirmada',
        template: 'appointment_rejected',
        appointmentId: appointment._id.toString(),
        html: appointmentRejectedTemplate({
          name: appointment.nombre,
          reason: payload.motivoRechazo,
        }),
      })
    } catch (emailError) {
      console.error('Error sending appointment rejection email:', emailError)
      emailWarning = 'La cita fue rechazada, pero no se pudo enviar el correo.'
    }

    return Response.json({ success: true, appointment, emailWarning })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Motivo de rechazo inválido', 400)) : toErrorResponse(err)
  }
}
