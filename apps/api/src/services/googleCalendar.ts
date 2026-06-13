import { google } from 'googleapis'
import { TIMEZONE } from '../utils/dates'

type CalendarEventInput = {
  summary: string
  description: string
  attendeeEmail: string
  start: Date
  end: Date
}

export const createCalendarMeetEvent = async ({
  summary,
  description,
  attendeeEmail,
  start,
  end,
}: CalendarEventInput) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const calendarId = process.env.GOOGLE_CALENDAR_ID

  if (!clientId || !clientSecret || !refreshToken || !calendarId) {
    throw new Error('Configuración de Google Calendar incompleta')
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret)
  auth.setCredentials({ refresh_token: refreshToken })

  const calendar = google.calendar({ version: 'v3', auth })
  const event = await calendar.events.insert({
    calendarId,
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
          requestId: `servasmar-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  })

  return {
    eventId: event.data.id || '',
    meetLink: event.data.hangoutLink || '',
  }
}
