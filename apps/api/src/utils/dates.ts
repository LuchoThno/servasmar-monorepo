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

const getTimeZoneOffsetMs = (timeZone: string, date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  )

  return asUtc - date.getTime()
}

export const zonedDateTimeToUtc = (date: string, time: string, timeZone = TIMEZONE) => {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
  const firstOffset = getTimeZoneOffsetMs(timeZone, utcGuess)
  const firstResult = new Date(utcGuess.getTime() - firstOffset)
  const secondOffset = getTimeZoneOffsetMs(timeZone, firstResult)

  return new Date(utcGuess.getTime() - secondOffset)
}

export const combineDateAndTime = (date: string, time: string) => zonedDateTimeToUtc(date, time)

export const formatDateForEmail = (date: Date) =>
  new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'full',
    timeZone: TIMEZONE,
  }).format(date)
