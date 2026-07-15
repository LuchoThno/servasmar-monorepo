import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { IncomeModel } from '../../../../../../../../api/src/models/Income'
import { requirePermission } from '../../../../_lib/auth'
import { toErrorResponse } from '../../../../_lib/apiError'
import { syncInstallmentPaymentStatus, syncInvoicePaymentStatus } from '@/lib/financeAccounting'
import { objectIdSchema } from '@/lib/financeApi'

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const params = await context.params
    const id = objectIdSchema.parse(params.id)
    await connectToDatabase()

    const income = await IncomeModel.findById(id)
    if (!income || income.status === 'deleted') {
      return Response.json({ success: false, error: { message: 'Ingreso no encontrado' } }, { status: 404 })
    }

    income.status = 'deleted'
    income.updatedBy = authorized.email
    await income.save()

    if (income.installmentId) await syncInstallmentPaymentStatus(String(income.installmentId))
    if (income.invoiceId) await syncInvoicePaymentStatus(String(income.invoiceId))

    return Response.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
