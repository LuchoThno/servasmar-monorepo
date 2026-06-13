import { AppointmentModel } from '../models/Appointment'
import { AvailabilityModel } from '../models/Availability'
import { dateStringToDate, getWeekday, minutesFromTime, timeFromMinutes } from '../utils/dates'

type BlockedSlot = {
  date: string
  start: string
  end: string
  reason?: string
}

export const getOrCreateDefaultAvailability = async () => {
  const existing = await AvailabilityModel.findOne({ name: 'default' })
  if (existing) {
    return existing
  }

  return AvailabilityModel.create({
    name: 'default',
    timezone: 'America/Santiago',
    businessDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '18:00',
    meetingDurationMinutes: 60,
    blockedSlots: [],
  })
}

export const getAvailableSlots = async (date: string) => {
  const availability = await getOrCreateDefaultAvailability()
  const weekday = getWeekday(date)

  if (!availability.businessDays.includes(weekday)) {
    return []
  }

  const start = minutesFromTime(availability.startTime)
  const end = minutesFromTime(availability.endTime)
  const duration = availability.meetingDurationMinutes
  const slots: string[] = []

  for (let value = start; value + duration <= end; value += duration) {
    slots.push(timeFromMinutes(value))
  }

  const takenAppointments = await AppointmentModel.find({
    fechaSolicitada: dateStringToDate(date),
    estado: { $in: ['pendiente', 'aprobada'] },
  }).select('horaSolicitada horaFinal estado')

  const taken = new Set(
    takenAppointments.map((appointment) => appointment.horaFinal || appointment.horaSolicitada)
  )

  const blockedSlots = (availability.blockedSlots as BlockedSlot[])
    .filter((slot) => slot.date === date)
    .flatMap((slot) => {
      const values: string[] = []
      const blockedStart = minutesFromTime(slot.start)
      const blockedEnd = minutesFromTime(slot.end)
      for (let value = blockedStart; value < blockedEnd; value += duration) {
        values.push(timeFromMinutes(value))
      }
      return values
    })
  const blocked = new Set(blockedSlots)

  return slots.filter((slot) => !taken.has(slot) && !blocked.has(slot))
}

export const assertSlotAvailable = async (date: string, time: string) => {
  const slots = await getAvailableSlots(date)
  return slots.includes(time)
}
