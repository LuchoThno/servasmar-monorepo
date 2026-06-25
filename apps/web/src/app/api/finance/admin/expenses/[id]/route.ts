import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { ExpenseModel } from '../../../../../../../../api/src/models/Expense'
import { requirePermission } from '../../../../_lib/auth'
import { toErrorResponse } from '../../../../_lib/apiError'
import { objectIdSchema } from '@/lib/financeApi'
import { z } from 'zod'

const expenseStatusSchema = z.object({
  status: z.enum(['pendiente', 'pagado', 'anulado']),
})

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = objectIdSchema.parse(params.id)
    await connectToDatabase()

    const expense = await ExpenseModel.findByIdAndDelete(id)
    if (!expense) {
      return Response.json({ success: false, error: { message: 'Egreso no encontrado' } }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = objectIdSchema.parse(params.id)
    const payload = expenseStatusSchema.parse(await req.json())
    await connectToDatabase()

    const expense = await ExpenseModel.findByIdAndUpdate(
      id,
      { $set: { status: payload.status, updatedBy: authorized.email } },
      { new: true }
    )
      .populate('clientId', 'name taxId')
      .populate('projectId', 'name code serviceType')

    if (!expense) {
      return Response.json({ success: false, error: { message: 'Egreso no encontrado' } }, { status: 404 })
    }

    return Response.json({ success: true, expense })
  } catch (error) {
    return toErrorResponse(error)
  }
}
