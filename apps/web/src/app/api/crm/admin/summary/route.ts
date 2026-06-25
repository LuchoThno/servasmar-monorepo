import { NextRequest } from 'next/server'
import { z } from 'zod'
import { connectToDatabase } from '../../../../../../../api/src/config/db'

import { requirePermission } from '../../../_lib/auth'
import { toErrorResponse } from '../../../_lib/apiError'
import { CrmClientModel } from '../../../../../../../api/src/models/CrmClient'
import { CrmProjectModel } from '../../../../../../../api/src/models/CrmProject'
import { ExpenseModel } from '../../../../../../../api/src/models/Expense'
import { IncomeModel } from '../../../../../../../api/src/models/Income'
import { InstallmentModel } from '../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../api/src/models/Invoice'
import { applyRuntimeInstallmentState, applyRuntimeInvoiceState } from '@/lib/financeReadModels'
import { startOfTodayUtc } from '@/lib/finance'

const openProjectStatuses = ['prospecto', 'cotizado', 'aprobado', 'en_ejecucion', 'en_progreso', 'pausado', 'facturado'] as const



export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'clients', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    await connectToDatabase()

    const [clients, activeClients, projects, openProjects, incomeRows, expenseRows, invoiceRows, installmentRows] = await Promise.all([
      CrmClientModel.countDocuments(),
      CrmClientModel.countDocuments({ status: 'activo' }),
      CrmProjectModel.countDocuments(),
      CrmProjectModel.countDocuments({ status: { $in: openProjectStatuses } }),
      IncomeModel.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      ExpenseModel.aggregate([
        { $match: { status: { $in: ['pendiente', 'pagado'] } } },
        { $group: { _id: '$status', total: { $sum: '$amount' } } },
      ]),
      InvoiceModel.find({ status: { $ne: 'anulada' } }).select('_id totalAmount dueDate status').lean(),
      InstallmentModel.find({ status: { $ne: 'anulada' } }).select('invoiceId amount dueDate status').lean(),
    ])

    const taskKpis = await CrmProjectModel.aggregate([
      { $unwind: { path: '$tasks', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$tasks.status', total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    const today = startOfTodayUtc()
    const installmentsByInvoice = new Map<string, typeof installmentRows>()
    for (const installment of installmentRows) {
      const key = String(installment.invoiceId)
      const current = installmentsByInvoice.get(key) || []
      current.push(installment)
      installmentsByInvoice.set(key, current)
    }

    const hydratedInvoices = invoiceRows.map((invoice: any) =>
      applyRuntimeInvoiceState(invoice, installmentsByInvoice.get(String(invoice._id)) || [], today)
    )
    const hydratedInstallments = installmentRows.map((installment) => applyRuntimeInstallmentState(installment, today))

    const incomeTotal = Number(incomeRows[0]?.total || 0)
    const pendingPayables = expenseRows
      .filter((row) => row._id === 'pendiente')
      .reduce((total, row) => total + Number(row.total || 0), 0)
    const paidExpenses = expenseRows
      .filter((row) => row._id === 'pagado')
      .reduce((total, row) => total + Number(row.total || 0), 0)
    const receivablesPending = hydratedInvoices
      .filter((invoice: any) => invoice.status === 'pendiente')
      .reduce((total, invoice: any) => total + Number(invoice.totalAmount || 0), 0)
    const overdueReceivables = hydratedInvoices
      .filter((invoice: any) => invoice.status === 'vencida')
      .reduce((total, invoice: any) => total + Number(invoice.totalAmount || 0), 0)
    const overdueInstallments = hydratedInstallments.filter((installment) => installment.status === 'vencida').length

    return Response.json({
      success: true,
      summary: {
        clients,
        activeClients,
        projects,
        openProjects,
        finance: {
          incomeTotal,
          expenseTotal: paidExpenses,
          utility: incomeTotal - paidExpenses,
          receivablesPending,
          overdueReceivables,
          pendingPayables,
          overdueInstallments,
        },
        taskKpis,
      },
    })
  } catch (err) {
    // NextResponse error handler parity
    return toErrorResponse(err)
  }
}
