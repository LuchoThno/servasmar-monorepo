import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../../../api/src/config/db'
import { ActivityLogModel } from '../../../../../../../../../api/src/models/ActivityLog'
import { requirePermission } from '../../../../../_lib/auth'
import { toErrorResponse } from '../../../../../_lib/apiError'
import { objectIdSchema } from '@/lib/financeApi'
import { z } from 'zod'

const updateActionSchema = z.object({
  status: z.enum(['active', 'resolved']),
})

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = objectIdSchema.parse(params.id)
    const body = updateActionSchema.parse(await req.json())
    await connectToDatabase()

    const action = await ActivityLogModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: body.status,
          updatedBy: authorized.email,
          resolvedBy: body.status === 'resolved' ? authorized.email : '',
          resolvedAt: body.status === 'resolved' ? new Date() : null,
        },
      },
      { new: true }
    )
      .populate('clientId', 'name')
      .populate('projectId', 'name code')
      .populate('invoiceId', 'invoiceNumber')
      .populate('installmentId', 'installmentNumber')

    if (!action) {
      return Response.json({ success: false, error: { message: 'Gestión de cobranza no encontrada' } }, { status: 404 })
    }

    return Response.json({ success: true, action })
  } catch (error) {
    return toErrorResponse(error)
  }
}
