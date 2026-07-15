import { NextRequest } from 'next/server'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../api/src/config/db'
import { AppointmentModel } from '../../../../../api/src/models/Appointment'
import { assertSlotAvailable } from '../../../../../api/src/services/availability'
import {
  appointmentInternalNotificationTemplate,
  appointmentReceivedTemplate,
  sendEmail,
} from '../../../../../api/src/services/email'
import { formatDateForEmail } from '../../../../../api/src/utils/dates'
import { dateStringToDate } from '../../../../../api/src/utils/dates'
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

    const emailWarnings: string[] = []
    try {
      await sendEmail({
        to: appointment.email,
        subject: 'Solicitud de reunión recibida',
        template: 'appointment_received',
        appointmentId: appointment._id.toString(),
        html: appointmentReceivedTemplate(appointment.nombre),
      })
    } catch (emailError) {
      console.error('Error sending appointment received email:', emailError)
      emailWarnings.push('No se pudo enviar el correo de confirmación al usuario.')
    }

    const contactEmail = process.env.CONTACT_EMAIL
    if (!contactEmail) {
      emailWarnings.push('CONTACT_EMAIL no está configurado para notificaciones internas.')
    } else {
      try {
        await sendEmail({
          to: contactEmail,
          subject: `Nueva solicitud de reunión: ${appointment.empresa}`,
          template: 'appointment_internal_notification',
          appointmentId: appointment._id.toString(),
          html: appointmentInternalNotificationTemplate({
            name: appointment.nombre,
            company: appointment.empresa,
            email: appointment.email,
            phone: appointment.telefono,
            reason: appointment.motivo,
            requestedDate: formatDateForEmail(appointment.fechaSolicitada),
            requestedTime: appointment.horaSolicitada,
            notes: appointment.observaciones,
          }),
        })
      } catch (emailError) {
        console.error('Error sending internal appointment notification email:', emailError)
        emailWarnings.push('No se pudo enviar la notificación interna a SERVASMAR.')
      }
    }

    const emailWarning = emailWarnings.length ? `La solicitud fue registrada, pero ${emailWarnings.join(' ')}` : undefined

    return Response.json({ success: true, appointment, emailWarning }, { status: 201 })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Datos de cita inválidos', 400)) : toErrorResponse(err)
  }
}
