import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../../api/src/config/db'
import { CrmClientModel } from '../../../../../../../../api/src/models/CrmClient'
import { ExpenseModel } from '../../../../../../../../api/src/models/Expense'
import { IncomeModel } from '../../../../../../../../api/src/models/Income'
import { CrmProjectModel } from '../../../../../../../../api/src/models/CrmProject'
import { InstallmentModel } from '../../../../../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../../../../../api/src/models/Invoice'
import { requirePermission } from '../../../../_lib/auth'
import { toErrorResponse } from '../../../../_lib/apiError'
import { buildExpenseByCategoryPipeline, buildProjectProfitabilityPipeline } from '@/lib/financeInsights'
import { applyRuntimeInstallmentState, applyRuntimeInvoiceState } from '@/lib/financeReadModels'
import { startOfTodayUtc } from '@/lib/finance'

const monthLabel = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    await connectToDatabase()

    const now = new Date()
    const monthWindows = Array.from({ length: 6 }).map((_, index) => {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1))
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
      return { start, end, label: monthLabel(start) }
    })

    const sixMonthStart = monthWindows[0].start

    const [
      incomesByMonth,
      expensesByMonth,
      allInvoices,
      allInstallments,
      clientIncome,
      categoryExpenses,
      projectResults,
      clientCollectionRows,
    ] = await Promise.all([
      IncomeModel.aggregate([
        { $match: { status: 'active', date: { $gte: sixMonthStart } } },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
            },
            total: { $sum: '$amount' },
          },
        },
      ]),
      ExpenseModel.aggregate([
        { $match: { status: { $in: ['pendiente', 'pagado'] }, date: { $gte: sixMonthStart } } },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
            },
            total: { $sum: '$amount' },
          },
        },
      ]),
      InvoiceModel.find({ status: { $ne: 'anulada' } })
        .populate('clientId', 'name')
        .populate('projectId', 'name code')
        .limit(100),
      InstallmentModel.find({ status: { $ne: 'anulada' } })
        .select('clientId invoiceId amount dueDate status')
        .lean(),
      IncomeModel.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$clientId', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'crmclients',
            localField: '_id',
            foreignField: '_id',
            as: 'client',
          },
        },
        { $unwind: '$client' },
        { $project: { _id: 1, total: 1, name: '$client.name', taxId: '$client.taxId' } },
      ]),
      ExpenseModel.aggregate(buildExpenseByCategoryPipeline()),
      CrmProjectModel.aggregate(buildProjectProfitabilityPipeline(12)),
      CrmClientModel.find({}, 'name').lean(),
    ])

    const incomeMap = new Map(incomesByMonth.map((item) => [`${item._id.year}-${String(item._id.month).padStart(2, '0')}`, item.total]))
    const expenseMap = new Map(expensesByMonth.map((item) => [`${item._id.year}-${String(item._id.month).padStart(2, '0')}`, item.total]))

    const cashFlow = monthWindows.map((window) => ({
      month: window.label,
      income: incomeMap.get(window.label) || 0,
      expense: expenseMap.get(window.label) || 0,
      net: (incomeMap.get(window.label) || 0) - (expenseMap.get(window.label) || 0),
    }))

    const totals = cashFlow.reduce(
      (acc, item) => ({
        income: acc.income + item.income,
        expense: acc.expense + item.expense,
        net: acc.net + item.net,
      }),
      { income: 0, expense: 0, net: 0 }
    )

    const today = startOfTodayUtc()
    const installmentsByInvoice = new Map<string, typeof allInstallments>()
    for (const installment of allInstallments) {
      const key = String(installment.invoiceId)
      const current = installmentsByInvoice.get(key) || []
      current.push(installment)
      installmentsByInvoice.set(key, current)
    }

    const overdueInvoices = allInvoices
      .map((invoice) => applyRuntimeInvoiceState(invoice, installmentsByInvoice.get(String(invoice._id)) || [], today))
      .filter((invoice) => invoice.status === 'vencida')
      .sort((a: any, b: any) => Number(b.daysOverdue || 0) - Number(a.daysOverdue || 0) || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    const clientNameById = new Map(clientCollectionRows.map((client: any) => [String(client._id), client.name]))
    const collectionsByClientMap = new Map<string, { _id: string; pending: number; overdueCount: number; name: string }>()
    for (const row of allInstallments.map((installment) => applyRuntimeInstallmentState(installment, today))) {
      if (row.status !== 'pendiente' && row.status !== 'pago_parcial' && row.status !== 'vencida') continue
      const key = String(row.clientId)
      const current = collectionsByClientMap.get(key) || {
        _id: key,
        pending: 0,
        overdueCount: 0,
        name: clientNameById.get(key) || 'Cliente',
      }
      current.pending += Number(row.amount || 0)
      if (row.status === 'vencida') current.overdueCount += 1
      collectionsByClientMap.set(key, current)
    }
    const clientCollections = Array.from(collectionsByClientMap.values())
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 10)

    return Response.json({
      success: true,
      reports: {
        cashFlow,
        resultSummary: totals,
        overdueInvoices,
        incomeByClient: clientIncome,
        expensesByCategory: categoryExpenses,
        projectResults,
        collectionsByClient: clientCollections,
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
