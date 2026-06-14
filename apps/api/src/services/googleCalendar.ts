import { google } from 'googleapis'
import { TIMEZONE } from '../utils/dates'

type CalendarEventInput = {
  summary: string
  description: string
  attendeeEmail: string
  start: Date
  end: Date
}

const placeholderValues = new Set([
  'your-google-client-id.apps.googleusercontent.com',
  'your-google-client-secret',
  'your-google-refresh-token',
])

const getGoogleCalendarConfig = () => {
  const values = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  }

  const missing = Object.entries(values)
    .filter(([key, value]) => key !== 'calendarId' && (!value || placeholderValues.has(value)))
    .map(([key]) => key)

  return { ...values, missing }
}

export const getGoogleCalendarStatus = async () => {
  const config = getGoogleCalendarConfig()
  if (config.missing.length) {
    return {
      configured: false,
      calendarId: config.calendarId,
      missing: config.missing,
      message: 'Faltan credenciales reales de Google Calendar',
    }
  }

  const auth = new google.auth.OAuth2(config.clientId, config.clientSecret)
  auth.setCredentials({ refresh_token: config.refreshToken })

  const calendar = google.calendar({ version: 'v3', auth })
  await calendar.events.list({
    calendarId: config.calendarId,
    maxResults: 1,
    singleEvents: true,
  })

  return {
    configured: true,
    calendarId: config.calendarId,
    missing: [],
    message: 'Google Calendar conectado correctamente',
  }
}

export const createCalendarMeetEvent = async ({
  summary,
  description,
  attendeeEmail,
  start,
  end,
}: CalendarEventInput) => {
  const config = getGoogleCalendarConfig()

  if (config.missing.length) {
    throw new Error(`Configuración de Google Calendar incompleta: ${config.missing.join(', ')}`)
  }

  const auth = new google.auth.OAuth2(config.clientId, config.clientSecret)
  auth.setCredentials({ refresh_token: config.refreshToken })

  const calendar = google.calendar({ version: 'v3', auth })
  const event = await calendar.events.insert({
    calendarId: config.calendarId,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary,
      description,
      start: {
        dateTime: start.toISOString(),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: TIMEZONE,
      },
      attendees: [{ email: attendeeEmail }],
      conferenceData: {
        createRequest: {
          requestId: `servasmar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  })

  const eventId = event.data.id || ''
  const meetLink = event.data.hangoutLink || event.data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri || ''

  if (!eventId || !meetLink) {
    throw new Error('Google Calendar creó una respuesta incompleta sin enlace de Meet')
  }

  return { eventId, meetLink }
}
