import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { ActivityLogModel } from '../../../../../../../../api/src/models/ActivityLog'
import { InstallmentModel } from '../../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../../api/src/models/Invoice'
import { requirePermission } from '../../../../_lib/auth'
import { toErrorResponse } from '../../../../_lib/apiError'
import { applyRuntimeInstallmentState, applyRuntimeInvoiceState } from '@/lib/financeReadModels'
import { startOfTodayUtc } from '@/lib/finance'

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    await connectToDatabase()

    const [invoiceDocs, installmentDocs, pendingActions] = await Promise.all([
      InvoiceModel.find({ status: { $ne: 'anulada' } })
        .populate('clientId', 'name taxId email')
        .populate('projectId', 'name code')
        .limit(200),
      InstallmentModel.find({ status: { $ne: 'anulada' } })
        .populate('clientId', 'name taxId email')
        .populate('projectId', 'name code')
        .populate('invoiceId', 'invoiceNumber totalAmount')
        .limit(300),
      ActivityLogModel.find({ status: 'active', entityType: { $in: ['invoice', 'installment'] } })
        .populate('clientId', 'name')
        .populate('projectId', 'name code')
        .populate('invoiceId', 'invoiceNumber')
        .populate('installmentId', 'installmentNumber')
        .sort({ createdAt: -1 })
        .limit(300),
    ])

    const today = startOfTodayUtc()
    const installmentsByInvoice = new Map<string, any[]>()
    for (const installment of installmentDocs) {
      const key = String((installment as any).invoiceId?._id || (installment as any).invoiceId)
      const current = installmentsByInvoice.get(key) || []
      current.push(installment)
      installmentsByInvoice.set(key, current)
    }

    const overdueInstallments = installmentDocs
      .map((installment) => applyRuntimeInstallmentState(installment, today))
      .filter((installment) => installment.status === 'vencida')
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    const overdueInvoices = invoiceDocs
      .map((invoice) => applyRuntimeInvoiceState(invoice, installmentsByInvoice.get(String(invoice._id)) || [], today))
      .filter((invoice) => invoice.status === 'vencida')
      .sort((a: any, b: any) => Number(b.daysOverdue || 0) - Number(a.daysOverdue || 0) || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    const alertSummary = {
      overdueInvoices: overdueInvoices.length,
      overdueInstallments: overdueInstallments.length,
      severeInvoices: overdueInvoices.filter((item: any) => Number(item.daysOverdue || 0) >= 30).length,
      pendingActions: pendingActions.length,
    }

    return Response.json({ success: true, alertSummary, overdueInvoices, overdueInstallments, pendingActions })
  } catch (error) {
    return toErrorResponse(error)
  }
}
