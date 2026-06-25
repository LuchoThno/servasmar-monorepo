import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { AppointmentModel } from '../../../../../../../../api/src/models/Appointment'
import { buildAppointmentNotificationRecipients, resolveLinkedClientsForAppointment } from '@/lib/appointmentClients'
import { enviarCorreoReagendacionCita } from '@/lib/email'
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

    const linkedClients = await resolveLinkedClientsForAppointment({
      email: appointment.email,
      empresa: appointment.empresa,
      linkedClientIds: Array.isArray(appointment.linkedClientIds) ? appointment.linkedClientIds.map((value: any) => String(value)) : [],
    })
    const notificationRecipients = buildAppointmentNotificationRecipients({
      requesterName: appointment.nombre,
      requesterEmail: appointment.email,
      linkedClients,
    })

    appointment.estado = 'rechazada'
    appointment.motivoRechazo = payload.motivoRechazo
    appointment.linkedClientIds = linkedClients.map((client) => new Types.ObjectId(client._id))
    await appointment.save()

    let emailWarning: string | undefined
    try {
      await enviarCorreoReagendacionCita({
        recipients: notificationRecipients,
        empresa: appointment.empresa,
        motivo: appointment.motivo,
        reason: payload.motivoRechazo,
      })
    } catch (emailError) {
      console.error('Error sending appointment rejection email:', emailError)
      emailWarning = 'La cita quedo para reagendamiento, pero no se pudo enviar el correo a todos los asistentes.'
    }

    const populated = await AppointmentModel.findById(id).populate('linkedClientIds', 'name email contacts')
    return Response.json({ success: true, appointment: populated || appointment, emailWarning })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Motivo de rechazo inválido', 400)) : toErrorResponse(err)
  }
}
