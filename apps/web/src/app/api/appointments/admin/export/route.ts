import { NextRequest } from 'next/server'

import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { AppointmentModel } from '../../../../../../../api/src/models/Appointment'
import { toErrorResponse } from '../../../_lib/apiError'
import { requirePermission } from '../../../_lib/auth'

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'tasks', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

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

    return new Response([headers.join(','), ...rows].join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="citas-servasmar.csv"',
      },
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
