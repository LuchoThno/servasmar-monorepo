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
    const [pendientes, aprobadas, rechazadas, proximas] = await Promise.all([
      AppointmentModel.countDocuments({ estado: 'pendiente' }),
      AppointmentModel.countDocuments({ estado: 'aprobada' }),
      AppointmentModel.countDocuments({ estado: 'rechazada' }),
      AppointmentModel.find({ estado: 'aprobada', fechaFinal: { $gte: new Date() } }).sort({ fechaFinal: 1 }).limit(5),
    ])

    return Response.json({
      success: true,
      summary: { pendientes, aprobadas, rechazadas, proximas: proximas.length },
      upcoming: proximas,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
