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
  '************',
])

const oauthPlaygroundClientId = '407408718192.apps.googleusercontent.com'

const isIcalAddress = (value: string) => value.includes('/calendar/ical/') || value.endsWith('.ics')

const getSafeCalendarId = (calendarId: string) => {
  if (!calendarId) return 'primary'
  return isIcalAddress(calendarId) ? 'URL iCal detectada (no usar como Calendar ID)' : calendarId
}

const getGoogleCalendarConfig = () => {
  const values = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
  }

  const missing = Object.entries(values)
    .filter(([key, value]) => !['calendarId', 'redirectUri'].includes(key) && (!value || placeholderValues.has(value)))
    .map(([key]) => key)

  return { ...values, missing }
}

export const getSafeGoogleCalendarId = () => getSafeCalendarId(process.env.GOOGLE_CALENDAR_ID || 'primary')

const getInvalidIcalConfigMessage = (config: ReturnType<typeof getGoogleCalendarConfig>) => {
  if (isIcalAddress(config.refreshToken)) {
    return 'GOOGLE_REFRESH_TOKEN contiene una URL iCal. Debe contener un refresh token OAuth generado con el cliente Google Cloud del proyecto.'
  }

  if (isIcalAddress(config.calendarId)) {
    return 'GOOGLE_CALENDAR_ID contiene una URL iCal. Debe ser "primary" o el Calendar ID, por ejemplo 95d0f9658fb10720a040e32f72f1670586f3c20d26feb66e2f9f7c7bf31a810d@group.calendar.google.com.'
  }

  return null
}

export const getGoogleCalendarStatus = async () => {
  const config = getGoogleCalendarConfig()
  const invalidIcalMessage = getInvalidIcalConfigMessage(config)

  if (invalidIcalMessage) {
    return {
      configured: false,
      calendarId: getSafeCalendarId(config.calendarId),
      missing: [],
      message: invalidIcalMessage,
    }
  }

  if (config.missing.length) {
    return {
      configured: false,
      calendarId: getSafeCalendarId(config.calendarId),
      missing: config.missing,
      message: 'Faltan credenciales reales de Google Calendar',
    }
  }

  if (config.clientId === oauthPlaygroundClientId) {
    return {
      configured: false,
      calendarId: getSafeCalendarId(config.calendarId),
      missing: [],
      message: 'El refresh token fue generado con el cliente OAuth Playground. Regenera el token usando el OAuth Client ID propio del proyecto Google Cloud.',
    }
  }

  const auth = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri || undefined)
  auth.setCredentials({ refresh_token: config.refreshToken })

  const calendar = google.calendar({ version: 'v3', auth })
  await calendar.events.list({
    calendarId: config.calendarId,
    maxResults: 1,
    singleEvents: true,
  })

  return {
    configured: true,
    calendarId: getSafeCalendarId(config.calendarId),
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
  const invalidIcalMessage = getInvalidIcalConfigMessage(config)

  if (config.missing.length) {
    throw new Error(`Configuración de Google Calendar incompleta: ${config.missing.join(', ')}`)
  }

  if (invalidIcalMessage) {
    throw new Error(invalidIcalMessage)
  }

  if (config.clientId === oauthPlaygroundClientId) {
    throw new Error('El refresh token fue generado con el cliente OAuth Playground. Regenera el token usando el OAuth Client ID propio del proyecto Google Cloud.')
  }

  const auth = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri || undefined)
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
