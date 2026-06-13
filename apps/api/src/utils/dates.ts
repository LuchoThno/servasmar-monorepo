export const TIMEZONE = 'America/Santiago'

export const dateStringToDate = (date: string) => new Date(`${date}T00:00:00.000Z`)

export const dateToDateString = (date: Date) => date.toISOString().slice(0, 10)

export const minutesFromTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export const timeFromMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export const getWeekday = (date: string) => {
  const value = dateStringToDate(date)
  return value.getUTCDay()
}

export const combineDateAndTime = (date: string, time: string) => new Date(`${date}T${time}:00.000`)

export const formatDateForEmail = (date: Date) =>
  new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'full',
    timeZone: TIMEZONE,
  }).format(date)
