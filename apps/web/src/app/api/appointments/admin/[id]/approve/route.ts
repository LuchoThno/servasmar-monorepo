import { NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { AppointmentModel } from '../../../../../../../../api/src/models/Appointment'
import { assertSlotAvailable, getOrCreateDefaultAvailability } from '../../../../../../../../api/src/services/availability'
import { createCalendarMeetEvent } from '../../../../../../../../api/src/services/googleCalendar'
import { combineDateAndTime, formatDateForEmail } from '../../../../../../../../api/src/utils/dates'
import { buildAppointmentNotificationRecipients, resolveLinkedClientsForAppointment } from '@/lib/appointmentClients'
import { createError, toErrorResponse } from '../../../../_lib/apiError'
import { requirePermission } from '../../../../_lib/auth'
import { enviarCorreoCita } from '@/lib/email'

const idSchema = z.string().refine((value) => Types.ObjectId.isValid(value), 'ID inválido')
const approveSchema = z.object({
  fechaFinal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  horaFinal: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

const createMeetingDates = (date: string, time: string, durationMinutes = 60) => {
  const start = combineDateAndTime(date, time)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  return { start, end }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params

  try {
    const authorized = await requirePermission(req, 'tasks', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const id = idSchema.parse(params.id)
    const payload = approveSchema.parse(await req.json())
    await connectToDatabase()

    const appointment = await AppointmentModel.findById(id)
    if (!appointment) throw createError('Cita no encontrada', 404)
    if (appointment.estado === 'aprobada') throw createError('La cita ya está aprobada', 409)

    const date = payload.fechaFinal || appointment.fechaSolicitada.toISOString().slice(0, 10)
    const time = payload.horaFinal || appointment.horaSolicitada
    const isAvailable = await assertSlotAvailable(date, time)
    if (!isAvailable && (date !== appointment.fechaSolicitada.toISOString().slice(0, 10) || time !== appointment.horaSolicitada)) {
      throw createError('El nuevo horario no está disponible', 409)
    }

    const availability = await getOrCreateDefaultAvailability()
    const { start, end } = createMeetingDates(date, time, availability.meetingDurationMinutes)

    const linkedClients = await resolveLinkedClientsForAppointment({
      email: appointment.email,
      empresa: appointment.empresa,
      linkedClientIds: Array.isArray(appointment.linkedClientIds) ? appointment.linkedClientIds.map((value: any) => String(value)) : [],
    })
    const notificationRecipients = buildAppointmentNotificationRecipients({
      requesterName: appointment.nombre,
      requesterEmail: appointment.email,
      linkedClients,
      corporateEmail: process.env.CONTACT_EMAIL,
      corporateName: 'Equipo SERVASMAR',
    })

    let calendar: Awaited<ReturnType<typeof createCalendarMeetEvent>>
    try {
      calendar = await createCalendarMeetEvent({
        summary: `Reunión SERVASMAR - ${appointment.empresa}`,
        description: `Motivo: ${appointment.motivo}\nSolicitante: ${appointment.nombre}\nTeléfono: ${appointment.telefono}`,
        attendeeEmails: notificationRecipients.map((recipient) => recipient.email),
        start,
        end,
      })
    } catch (calendarError) {
      const message = calendarError instanceof Error ? calendarError.message : 'No pudimos crear Google Meet'
      throw createError(`No pudimos crear Google Meet: ${message}`, 502)
    }

    appointment.estado = 'aprobada'
    appointment.fechaFinal = start
    appointment.horaFinal = time
    appointment.googleCalendarEventId = calendar.eventId
    appointment.googleMeetLink = calendar.meetLink
    appointment.motivoRechazo = ''
    appointment.linkedClientIds = linkedClients.map((client) => new Types.ObjectId(client._id))
    await appointment.save()

    let emailWarning: string | undefined
    try {
      await enviarCorreoCita({
        recipients: notificationRecipients,
        empresa: appointment.empresa,
        motivo: appointment.motivo,
        fecha: formatDateForEmail(start),
        hora: time,
        meetLink: calendar.meetLink,
      })
    } catch (emailError) {
      console.error('Error sending appointment approval email:', emailError)
      emailWarning = 'La cita fue aprobada, pero no se pudo enviar el correo a todos los asistentes.'
    }

    const populated = await AppointmentModel.findById(id).populate('linkedClientIds', 'name email contacts')
    return Response.json({ success: true, appointment: populated || appointment, emailWarning })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Datos de aprobación inválidos', 400)) : toErrorResponse(err)
  }
}
