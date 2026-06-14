import { NextRequest } from 'next/server'

import { getGoogleCalendarStatus, getSafeGoogleCalendarId } from '../../../../../../../../api/src/services/googleCalendar'
import { requirePermission } from '../../../../_lib/auth'

export async function GET(req: NextRequest) {
  const authorized = await requirePermission(req, 'tasks', 'read')
  if (authorized instanceof Response && 'status' in authorized) return authorized

  try {
    const status = await getGoogleCalendarStatus()
    return Response.json({ success: true, google: status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No pudimos verificar Google Calendar'
    return Response.json({
      success: true,
      google: {
        configured: false,
        calendarId: getSafeGoogleCalendarId(),
        missing: [],
        message: `No pudimos conectar Google Calendar: ${message}`,
      },
    })
  }
}
