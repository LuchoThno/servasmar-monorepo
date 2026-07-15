import { connectToDatabase } from '../../../../api/src/config/db'
import { ActivityLogModel } from '../../../../api/src/models/ActivityLog'
import { CrmClientModel } from '../../../../api/src/models/CrmClient'
import { ExpenseModel } from '../../../../api/src/models/Expense'
import { IncomeModel } from '../../../../api/src/models/Income'
import { CrmProjectModel } from '../../../../api/src/models/CrmProject'
import { InstallmentModel } from '../../../../api/src/models/Installment'
import { InvoiceModel } from '../../../../api/src/models/Invoice'
import { buildExpenseByCategoryPipeline, buildProjectProfitabilityPipeline } from '@/lib/financeInsights'
import { applyRuntimeInstallmentState, applyRuntimeInvoiceState } from '@/lib/financeReadModels'
import { startOfTodayUtc } from '@/lib/finance'

export const expenseCategoryLabels: Record<string, string> = {
  honorarios: 'Honorarios',
  transporte: 'Transporte',
  combustible: 'Combustible',
  hospedaje: 'Hospedaje',
  alimentacion: 'Alimentacion',
  equipamiento: 'Equipamiento',
  software: 'Software',
  marketing: 'Marketing',
  servicios_externos: 'Servicios externos',
  permisos: 'Permisos',
  impuestos: 'Impuestos',
  otros: 'Otros',
}

const monthLabel = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

export async function loadReportsPdfData() {
  await connectToDatabase()

  const now = new Date()
  const monthWindows = Array.from({ length: 6 }).map((_, index) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1))
    return { start, label: monthLabel(start) }
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
  ] = await Promise.all([
    IncomeModel.aggregate([
      { $match: { status: 'active', date: { $gte: sixMonthStart } } },
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' } } },
    ]),
    ExpenseModel.aggregate([
      { $match: { status: { $in: ['pendiente', 'pagado'] }, date: { $gte: sixMonthStart } } },
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' } } },
    ]),
    InvoiceModel.find({ status: { $ne: 'anulada' } }).populate('clientId', 'name').populate('projectId', 'name code').limit(150),
    InstallmentModel.find({ status: { $ne: 'anulada' } }).select('clientId invoiceId amount dueDate status').lean(),
    IncomeModel.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$clientId', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'crmclients', localField: '_id', foreignField: '_id', as: 'client' } },
      { $unwind: '$client' },
      { $project: { _id: 1, total: 1, name: '$client.name' } },
    ]),
    ExpenseModel.aggregate(buildExpenseByCategoryPipeline()),
    CrmProjectModel.aggregate(buildProjectProfitabilityPipeline(12)),
  ])

  const incomeMap = new Map(incomesByMonth.map((item) => [`${item._id.year}-${String(item._id.month).padStart(2, '0')}`, item.total]))
  const expenseMap = new Map(expensesByMonth.map((item) => [`${item._id.year}-${String(item._id.month).padStart(2, '0')}`, item.total]))

  const cashFlow = monthWindows.map((window) => ({
    month: window.label,
    income: incomeMap.get(window.label) || 0,
    expense: expenseMap.get(window.label) || 0,
    net: (incomeMap.get(window.label) || 0) - (expenseMap.get(window.label) || 0),
  }))

  const resultSummary = cashFlow.reduce(
    (acc, item) => ({
      income: acc.income + item.income,
      expense: acc.expense + item.expense,
      net: acc.net + item.net,
    }),
    { income: 0, expense: 0, net: 0 }
  )

  const today = startOfTodayUtc()
  const installmentsByInvoice = new Map<string, any[]>()
  for (const installment of allInstallments) {
    const key = String(installment.invoiceId)
    const current = installmentsByInvoice.get(key) || []
    current.push(installment)
    installmentsByInvoice.set(key, current)
  }

  const overdueInvoices = allInvoices
    .map((invoice) => applyRuntimeInvoiceState(invoice, installmentsByInvoice.get(String(invoice._id)) || [], today))
    .filter((invoice) => invoice.status === 'vencida')
    .sort((a: any, b: any) => Number(b.daysOverdue || 0) - Number(a.daysOverdue || 0))

  return {
    cashFlow,
    resultSummary,
    overdueInvoices,
    incomeByClient: clientIncome,
    expensesByCategory: categoryExpenses,
    projectResults,
  }
}

export async function loadFinancePdfData() {
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
    pendingActions,
  ] = await Promise.all([
    CrmClientModel.countDocuments({ status: { $in: ['activo', 'moroso'] } }),
    CrmProjectModel.countDocuments({ status: { $in: ['cotizado', 'aprobado', 'en_ejecucion', 'facturado', 'en_progreso', 'pausado'] } }),
    InstallmentModel.find({ status: { $ne: 'anulada' } })
      .populate('clientId', 'name')
      .populate('projectId', 'name code')
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .lean(),
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
    InvoiceModel.find({ status: { $ne: 'anulada' } })
      .populate('clientId', 'name')
      .populate('projectId', 'name code')
      .select('totalAmount dueDate status invoiceNumber clientId projectId')
      .lean(),
    CrmProjectModel.aggregate(buildProjectProfitabilityPipeline(8)),
    ExpenseModel.aggregate(buildExpenseByCategoryPipeline()),
    ActivityLogModel.find({ status: 'active', entityType: { $in: ['invoice', 'installment'] } })
      .populate('clientId', 'name')
      .populate('projectId', 'name code')
      .sort({ createdAt: -1 })
      .limit(10),
  ])

  const today = startOfTodayUtc()
  const installmentsByInvoice = new Map<string, any[]>()
  for (const installment of allInstallments) {
    const key = String((installment as any).invoiceId?._id || (installment as any).invoiceId)
    const current = installmentsByInvoice.get(key) || []
    current.push(installment)
    installmentsByInvoice.set(key, current)
  }

  const hydratedInstallments = allInstallments.map((installment) => applyRuntimeInstallmentState(installment, today))
  const hydratedInvoices = allInvoices.map((invoice: any) =>
    applyRuntimeInvoiceState(invoice, installmentsByInvoice.get(String(invoice._id)) || [], today)
  )

  const pendingInstallments = hydratedInstallments.filter((item) => item.status === 'pendiente' || item.status === 'pago_parcial').length
  const overdueInstallments = hydratedInstallments.filter((item) => item.status === 'vencida').length
  const totalsByStatus = hydratedInvoices.reduce<Record<string, number>>((acc, invoice: any) => {
    acc[invoice.status] = (acc[invoice.status] || 0) + Number(invoice.totalAmount || 0)
    return acc
  }, {})
  const portfolioByStatus = Object.entries(totalsByStatus).map(([status, total]) => ({ _id: status, total })).sort((a, b) => b.total - a.total)
  const monthTotals = Object.fromEntries(monthlyInvoicing.map((item) => [item._id, item.total]))
  const monthIncomeTotal = monthlyIncome[0]?.total || 0
  const monthExpenseTotal = monthlyExpense[0]?.total || 0

  return {
    summary: {
      activeClients,
      activeProjects,
      invoicesPendingAmount: totalsByStatus.pendiente || 0,
      overdueInvoicesAmount: totalsByStatus.vencida || 0,
      pendingInstallments,
      overdueInstallments,
      monthlyIssued: (monthTotals.pendiente || 0) + (monthTotals.pagada || 0) + (monthTotals.vencida || 0),
      monthlyCollectedEstimate: monthIncomeTotal,
      monthlyIncome: monthIncomeTotal,
      monthlyExpense: monthExpenseTotal,
      monthlyUtility: monthIncomeTotal - monthExpenseTotal,
      portfolioByStatus,
      projectProfitability,
      expenseByCategory,
    },
    overdueInvoices: hydratedInvoices.filter((item: any) => item.status === 'vencida').sort((a: any, b: any) => Number(b.daysOverdue || 0) - Number(a.daysOverdue || 0)).slice(0, 12),
    overdueInstallments: hydratedInstallments.filter((item: any) => item.status === 'vencida').sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 12),
    pendingActions,
    alertSummary: {
      overdueInvoices: hydratedInvoices.filter((item: any) => item.status === 'vencida').length,
      overdueInstallments: hydratedInstallments.filter((item: any) => item.status === 'vencida').length,
      severeInvoices: hydratedInvoices.filter((item: any) => item.status === 'vencida' && Number(item.daysOverdue || 0) >= 30).length,
      pendingActions: pendingActions.length,
    },
  }
}

export async function loadProjectsPdfData() {
  await connectToDatabase()
  const projects = await CrmProjectModel.find({})
    .populate('clientId', 'name taxId email')
    .sort({ updatedAt: -1 })
    .limit(300)

  return { projects }
}
