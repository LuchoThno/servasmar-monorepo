import { NextFunction, Request, Response, Router } from 'express'
import { z } from 'zod'
import { connectToDatabase } from '../config/db'
import { requireAdmin, requirePermission } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { AppointmentModel } from '../models/Appointment'
import { assertSlotAvailable, getOrCreateDefaultAvailability } from '../services/availability'
import {
  appointmentApprovedTemplate,
  appointmentReceivedTemplate,
  appointmentRejectedTemplate,
  sendEmail,
} from '../services/email'
import { createCalendarMeetEvent, getGoogleCalendarStatus } from '../services/googleCalendar'
import { combineDateAndTime, dateStringToDate, formatDateForEmail } from '../utils/dates'

const router = Router()

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

const listQuerySchema = z.object({
  status: z.enum(['pendiente', 'aprobada', 'rechazada', 'cancelada']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
})

const approveSchema = z.object({
  fechaFinal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  horaFinal: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

const rejectSchema = z.object({
  motivoRechazo: z.string().min(3),
})

const createMeetingDates = (date: string, time: string, durationMinutes = 60) => {
  const start = combineDateAndTime(date, time)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  return { start, end }
}

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = appointmentSchema.parse(req.body)
    await connectToDatabase()

    const isAvailable = await assertSlotAvailable(payload.fechaSolicitada, payload.horaSolicitada)
    if (!isAvailable) {
      throw createError('El horario seleccionado ya no está disponible', 409)
    }

    const appointment = await AppointmentModel.create({
      ...payload,
      fechaSolicitada: dateStringToDate(payload.fechaSolicitada),
      estado: 'pendiente',
    })

    let emailWarning: string | undefined
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
      emailWarning = 'La solicitud fue registrada, pero no se pudo enviar el correo de confirmación.'
    }

    res.status(201).json({ success: true, appointment, emailWarning })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Datos de cita inválidos', 400) : error)
  }
})

router.use('/admin', requireAdmin)

router.get('/admin/dashboard', requirePermission('tasks', 'read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectToDatabase()
    const [pendientes, aprobadas, rechazadas, proximas] = await Promise.all([
      AppointmentModel.countDocuments({ estado: 'pendiente' }),
      AppointmentModel.countDocuments({ estado: 'aprobada' }),
      AppointmentModel.countDocuments({ estado: 'rechazada' }),
      AppointmentModel.find({ estado: 'aprobada', fechaFinal: { $gte: new Date() } })
        .sort({ fechaFinal: 1 })
        .limit(5),
    ])

    res.json({
      success: true,
      summary: { pendientes, aprobadas, rechazadas, proximas: proximas.length },
      upcoming: proximas,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/admin/google/status', requirePermission('tasks', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await getGoogleCalendarStatus()
    res.json({ success: true, google: status })
  } catch (error) {
    next(error)
  }
})

router.get('/admin/export', requirePermission('tasks', 'read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectToDatabase()
    const appointments = await AppointmentModel.find().sort({ createdAt: -1 })
    const headers = ['nombre', 'empresa', 'email', 'telefono', 'motivo', 'fechaSolicitada', 'horaSolicitada', 'estado', 'googleMeetLink']
    const rows = appointments.map((appointment) =>
      headers
        .map((header) => {
          const value = appointment.get(header)
          const text = value instanceof Date ? value.toISOString() : String(value || '')
          return `"${text.replace(/"/g, '""')}"`
        })
        .join(',')
    )

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="citas-servasmar.csv"')
    res.send([headers.join(','), ...rows].join('\n'))
  } catch (error) {
    next(error)
  }
})

router.get('/admin', requirePermission('tasks', 'read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query)
    await connectToDatabase()

    const filter: Record<string, unknown> = {}
    if (query.status) {
      filter.estado = query.status
    }
    if (query.date) {
      filter.fechaSolicitada = dateStringToDate(query.date)
    }
    if (query.search) {
      filter.$or = [
        { nombre: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { empresa: { $regex: query.search, $options: 'i' } },
      ]
    }

    const appointments = await AppointmentModel.find(filter).sort({ createdAt: -1 }).limit(200)
    res.json({ success: true, appointments })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Filtros inválidos', 400) : error)
  }
})

router.get('/admin/:id', requirePermission('tasks', 'read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectToDatabase()
    const appointment = await AppointmentModel.findById(req.params.id)
    if (!appointment) {
      throw createError('Cita no encontrada', 404)
    }
    res.json({ success: true, appointment })
  } catch (error) {
    next(error)
  }
})

router.patch('/admin/:id/approve', requirePermission('tasks', 'write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = approveSchema.parse(req.body)
    await connectToDatabase()

    const appointment = await AppointmentModel.findById(req.params.id)
    if (!appointment) {
      throw createError('Cita no encontrada', 404)
    }
    if (appointment.estado === 'aprobada') {
      throw createError('La cita ya está aprobada', 409)
    }

    const date = payload.fechaFinal || appointment.fechaSolicitada.toISOString().slice(0, 10)
    const time = payload.horaFinal || appointment.horaSolicitada
    const isAvailable = await assertSlotAvailable(date, time)
    if (!isAvailable && (date !== appointment.fechaSolicitada.toISOString().slice(0, 10) || time !== appointment.horaSolicitada)) {
      throw createError('El nuevo horario no está disponible', 409)
    }

    const availability = await getOrCreateDefaultAvailability()
    const { start, end } = createMeetingDates(date, time, availability.meetingDurationMinutes)
    const calendar = await createCalendarMeetEvent({
      summary: `Reunión SERVASMAR - ${appointment.empresa}`,
      description: `Motivo: ${appointment.motivo}\nSolicitante: ${appointment.nombre}\nTeléfono: ${appointment.telefono}`,
      attendeeEmail: appointment.email,
      start,
      end,
    })

    appointment.estado = 'aprobada'
    appointment.fechaFinal = start
    appointment.horaFinal = time
    appointment.googleCalendarEventId = calendar.eventId
    appointment.googleMeetLink = calendar.meetLink
    await appointment.save()

    let emailWarning: string | undefined
    try {
      await sendEmail({
        to: appointment.email,
        subject: `Reunión confirmada con ${appointment.empresa}`,
        template: 'appointment_approved',
        appointmentId: appointment._id.toString(),
        html: appointmentApprovedTemplate({
          name: appointment.nombre,
          company: appointment.empresa,
          date: formatDateForEmail(start),
          time,
          reason: appointment.motivo,
          meetLink: calendar.meetLink,
        }),
      })
    } catch (emailError) {
      console.error('Error sending appointment approval email:', emailError)
      emailWarning = 'La cita fue aprobada, pero no se pudo enviar el correo.'
    }

    res.json({ success: true, appointment, emailWarning })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Datos de aprobación inválidos', 400) : error)
  }
})

router.patch('/admin/:id/reject', requirePermission('tasks', 'write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = rejectSchema.parse(req.body)
    await connectToDatabase()

    const appointment = await AppointmentModel.findById(req.params.id)
    if (!appointment) {
      throw createError('Cita no encontrada', 404)
    }

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

    res.json({ success: true, appointment, emailWarning })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Motivo de rechazo inválido', 400) : error)
  }
})

export default router
