import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { CrmClientModel } from '../../../../../../../api/src/models/CrmClient'
import { ExpenseModel } from '../../../../../../../api/src/models/Expense'
import { IncomeModel } from '../../../../../../../api/src/models/Income'
import { CrmProjectModel } from '../../../../../../../api/src/models/CrmProject'
import { InstallmentModel } from '../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../api/src/models/Invoice'
import { requirePermission } from '../../../_lib/auth'
import { toErrorResponse } from '../../../_lib/apiError'
import { buildExpenseByCategoryPipeline, buildProjectProfitabilityPipeline } from '@/lib/financeInsights'
import { applyRuntimeInstallmentState, applyRuntimeInvoiceState } from '@/lib/financeReadModels'
import { startOfTodayUtc } from '@/lib/finance'

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    await connectToDatabase()

    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const nextMonthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1))

    const [
      activeClients,
      activeProjects,
      allInstallments,
      monthlyInvoicing,
      monthlyIncome,
      monthlyExpense,
      allInvoices,
      projectProfitability,
      expenseByCategory,
    ] = await Promise.all([
      CrmClientModel.countDocuments({ status: { $in: ['activo', 'moroso'] } }),
      CrmProjectModel.countDocuments({ status: { $in: ['cotizado', 'aprobado', 'en_ejecucion', 'facturado', 'en_progreso', 'pausado'] } }),
      InstallmentModel.find({ status: { $ne: 'anulada' } }).select('invoiceId amount dueDate status').lean(),
      InvoiceModel.aggregate([
        { $match: { issueDate: { $gte: monthStart, $lt: nextMonthStart }, status: { $ne: 'anulada' } } },
        { $group: { _id: '$status', total: { $sum: '$totalAmount' } } },
      ]),
      IncomeModel.aggregate([
        { $match: { date: { $gte: monthStart, $lt: nextMonthStart }, status: 'active' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      ExpenseModel.aggregate([
        { $match: { date: { $gte: monthStart, $lt: nextMonthStart }, status: { $in: ['pendiente', 'pagado'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      InvoiceModel.find({ status: { $ne: 'anulada' } }).select('totalAmount dueDate status').lean(),
      CrmProjectModel.aggregate(buildProjectProfitabilityPipeline(8)),
      ExpenseModel.aggregate(buildExpenseByCategoryPipeline()),
    ])

    const today = startOfTodayUtc()
    const installmentsByInvoice = new Map<string, typeof allInstallments>()
    for (const installment of allInstallments) {
      const key = String(installment.invoiceId)
      const current = installmentsByInvoice.get(key) || []
      current.push(installment)
      installmentsByInvoice.set(key, current)
    }

    const hydratedInstallments = allInstallments.map((installment) => applyRuntimeInstallmentState(installment, today))
    const hydratedInvoices = allInvoices.map((invoice: any) =>
      applyRuntimeInvoiceState(invoice, installmentsByInvoice.get(String(invoice._id)) || [], today)
    )

    const installmentsPending = hydratedInstallments.filter((item) => item.status === 'pendiente' || item.status === 'pago_parcial').length
    const installmentsOverdue = hydratedInstallments.filter((item) => item.status === 'vencida').length
    const totalsByStatus = hydratedInvoices.reduce<Record<string, number>>((acc, invoice: any) => {
      acc[invoice.status] = (acc[invoice.status] || 0) + Number(invoice.totalAmount || 0)
      return acc
    }, {})
    const portfolioByStatus = Object.entries(totalsByStatus)
      .map(([status, total]) => ({ _id: status, total }))
      .sort((a, b) => b.total - a.total)
    const monthTotals = Object.fromEntries(monthlyInvoicing.map((item) => [item._id, item.total]))
    const monthIncomeTotal = monthlyIncome[0]?.total || 0
    const monthExpenseTotal = monthlyExpense[0]?.total || 0

    return Response.json({
      success: true,
      summary: {
        activeClients,
        activeProjects,
        invoicesPendingAmount: totalsByStatus.pendiente || 0,
        overdueInvoicesAmount: totalsByStatus.vencida || 0,
        pendingInstallments: installmentsPending,
        overdueInstallments: installmentsOverdue,
        monthlyIssued: (monthTotals.pendiente || 0) + (monthTotals.pagada || 0) + (monthTotals.vencida || 0),
        monthlyCollectedEstimate: monthIncomeTotal,
        monthlyIncome: monthIncomeTotal,
        monthlyExpense: monthExpenseTotal,
        monthlyUtility: monthIncomeTotal - monthExpenseTotal,
        portfolioByStatus,
        projectProfitability,
        expenseByCategory,
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
