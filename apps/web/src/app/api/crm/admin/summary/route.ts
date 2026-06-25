import { NextRequest } from 'next/server'
import { z } from 'zod'
import { connectToDatabase } from '../../../../../../../api/src/config/db'

import { requirePermission } from '../../../_lib/auth'
import { toErrorResponse } from '../../../_lib/apiError'
import { CrmClientModel } from '../../../../../../../api/src/models/CrmClient'

import { CrmProjectModel } from '../../../../../../../api/src/models/CrmProject'

const openProjectStatuses = ['prospecto', 'cotizado', 'aprobado', 'en_ejecucion', 'en_progreso', 'pausado', 'facturado'] as const



export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'clients', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    await connectToDatabase()

    const [clients, activeClients, projects, openProjects] = await Promise.all([
      CrmClientModel.countDocuments(),
      CrmClientModel.countDocuments({ status: 'activo' }),
      CrmProjectModel.countDocuments(),
      CrmProjectModel.countDocuments({ status: { $in: openProjectStatuses } }),
    ])

    const finance = await CrmProjectModel.aggregate([
      { $unwind: { path: '$values', preserveNullAndEmptyArrays: false } },
      { $group: { _id: { currency: '$values.currency', type: { $ifNull: ['$values.type', 'ingreso'] } }, total: { $sum: '$values.amount' } } },
      { $sort: { _id: 1 } },
    ])

    const taskKpis = await CrmProjectModel.aggregate([
      { $unwind: { path: '$tasks', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$tasks.status', total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    return Response.json({ success: true, summary: { clients, activeClients, projects, openProjects, finance, taskKpis } })
  } catch (err) {
    // NextResponse error handler parity
    return toErrorResponse(err)
  }
}
