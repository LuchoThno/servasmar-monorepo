import { NextRequest } from 'next/server'
import { requirePermission } from '@/app/api/_lib/auth'
import { toErrorResponse } from '@/app/api/_lib/apiError'
import { createAdminPdfDocument, drawReportHeader, drawSectionTitle, drawTable, pdfToBuffer } from '@/lib/server/adminPdf'
import { expenseCategoryLabels, loadFinancePdfData } from '@/lib/server/adminPdfData'
import { registerPdfExport } from '@/lib/server/adminPdfLog'

export const runtime = 'nodejs'

const money = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount || 0)
const percent = (value: number) => `${Math.round(value || 0)}%`
const dateValue = (value?: string) => (value ? new Intl.DateTimeFormat('es-CL').format(new Date(value)) : '-')

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const data = await loadFinancePdfData()
    const exportLog = await registerPdfExport('finanzas', authorized, {
      rows: {
        portfolio: data.summary.portfolioByStatus.length,
        overdueInvoices: data.overdueInvoices.length,
        overdueInstallments: data.overdueInstallments.length,
      },
    })

    const utilitySignal =
      data.summary.monthlyUtility > 0
        ? 'Verde | Utilidad mensual favorable'
        : data.summary.monthlyUtility === 0
          ? 'Amarillo | Utilidad en equilibrio'
          : 'Rojo | Utilidad bajo presion'
    const delinquencySignal =
      data.alertSummary.severeInvoices > 0
        ? `Rojo | ${data.alertSummary.severeInvoices} factura(s) con mora severa`
        : data.alertSummary.overdueInvoices || data.alertSummary.overdueInstallments
          ? `Amarillo | ${data.alertSummary.overdueInvoices} factura(s) y ${data.alertSummary.overdueInstallments} cuota(s) vencidas`
          : 'Verde | Sin documentos vencidos'

    const doc = createAdminPdfDocument('SERVASMAR - Finanzas')

    drawReportHeader(doc, {
      title: 'Finanzas',
      subtitle: 'Control ejecutivo de cartera, mora, egresos y rentabilidad operativa.',
      sequenceLabel: exportLog.sequenceLabel,
      exportId: exportLog.exportId,
    })

    drawSectionTitle(doc, 'Semaforos ejecutivos', 'Lectura sintetica del estado financiero del modulo.')
    drawTable(
      doc,
      [
        { key: 'factor', label: 'Factor', width: 140 },
        { key: 'status', label: 'Estado', width: 375 },
      ],
      [
        { factor: 'Utilidad', status: utilitySignal },
        { factor: 'Mora', status: delinquencySignal },
      ]
    )

    drawSectionTitle(doc, 'Indicadores clave', 'Variables principales de caja y cobranza.')
    drawTable(
      doc,
      [
        { key: 'metric', label: 'Indicador', width: 220 },
        { key: 'value', label: 'Valor', width: 295, align: 'right' },
      ],
      [
        { metric: 'Por cobrar', value: money(data.summary.invoicesPendingAmount) },
        { metric: 'Vencido', value: money(data.summary.overdueInvoicesAmount) },
        { metric: 'Ingreso mensual', value: money(data.summary.monthlyIncome) },
        { metric: 'Egreso mensual', value: money(data.summary.monthlyExpense) },
        { metric: 'Utilidad mensual', value: money(data.summary.monthlyUtility) },
        { metric: 'Facturado en el mes', value: money(data.summary.monthlyIssued) },
        { metric: 'Cobrado estimado', value: money(data.summary.monthlyCollectedEstimate) },
        { metric: 'Cuotas vencidas', value: String(data.summary.overdueInstallments) },
      ]
    )

    drawSectionTitle(doc, 'Cartera por estado', 'Distribucion de la cartera según su estado actual.')
    drawTable(
      doc,
      [
        { key: 'status', label: 'Estado', width: 310 },
        { key: 'amount', label: 'Monto', width: 205, align: 'right' },
      ],
      data.summary.portfolioByStatus.map((row) => ({ status: row._id, amount: money(row.total) }))
    )

    drawSectionTitle(doc, 'Egresos por categoria', 'Concentracion de costo observada en el modulo.')
    drawTable(
      doc,
      [
        { key: 'category', label: 'Categoria', width: 310 },
        { key: 'amount', label: 'Monto', width: 205, align: 'right' },
      ],
      data.summary.expenseByCategory.map((row) => ({
        category: expenseCategoryLabels[row._id] || row._id,
        amount: money(row.total),
      }))
    )

    drawSectionTitle(doc, 'Rentabilidad por proyecto', 'Proyectos con mayor incidencia financiera.')
    drawTable(
      doc,
      [
        { key: 'project', label: 'Proyecto', width: 185 },
        { key: 'income', label: 'Ingresos', width: 95, align: 'right' },
        { key: 'expense', label: 'Egresos', width: 95, align: 'right' },
        { key: 'utility', label: 'Utilidad', width: 90, align: 'right' },
        { key: 'margin', label: 'Margen', width: 50, align: 'right' },
      ],
      data.summary.projectProfitability.map((project) => ({
        project: `${project.code ? `${project.code} · ` : ''}${project.name}`,
        income: money(project.totalIncome),
        expense: money(project.totalExpenses),
        utility: money(project.utility),
        margin: percent(project.margin),
      }))
    )

    drawSectionTitle(doc, 'Facturas vencidas', 'Cartera atrasada que requiere intervencion prioritaria.')
    drawTable(
      doc,
      [
        { key: 'invoice', label: 'Factura', width: 90 },
        { key: 'client', label: 'Cliente', width: 155 },
        { key: 'project', label: 'Proyecto', width: 140 },
        { key: 'dueDate', label: 'Vence', width: 60, align: 'center' },
        { key: 'days', label: 'Mora', width: 45, align: 'right' },
        { key: 'amount', label: 'Monto', width: 75, align: 'right' },
      ],
      data.overdueInvoices.map((invoice: any) => ({
        invoice: invoice.invoiceNumber,
        client: invoice.clientId?.name || '-',
        project: invoice.projectId?.code ? `${invoice.projectId.code} · ${invoice.projectId.name}` : invoice.projectId?.name || '-',
        dueDate: dateValue(invoice.dueDate),
        days: `${invoice.daysOverdue} d`,
        amount: money(invoice.totalAmount),
      }))
    )

    drawSectionTitle(doc, 'Cuotas vencidas y acciones', 'Seguimiento operativo asociado a mora y gestion pendiente.')
    drawTable(
      doc,
      [
        { key: 'reference', label: 'Referencia', width: 180 },
        { key: 'client', label: 'Cliente', width: 120 },
        { key: 'date', label: 'Fecha', width: 80, align: 'center' },
        { key: 'detail', label: 'Detalle', width: 135 },
      ],
      [
        ...data.overdueInstallments.slice(0, 6).map((item: any) => ({
          reference: `Cuota ${item.installmentNumber}`,
          client: item.clientId?.name || '-',
          date: dateValue(item.dueDate),
          detail: money(item.amount),
        })),
        ...data.pendingActions.slice(0, 6).map((item: any) => ({
          reference: item.title || item.actionType || 'Gestion',
          client: item.clientId?.name || '-',
          date: dateValue(item.createdAt),
          detail: item.projectId?.code ? `${item.projectId.code} · ${item.projectId.name}` : item.projectId?.name || '-',
        })),
      ]
    )

    const buffer = await pdfToBuffer(doc, {
      downloadedBy: authorized.email,
      generatedAt: exportLog.generatedAt,
      documentType: 'Finanzas',
      exportId: exportLog.exportId,
      sequenceLabel: exportLog.sequenceLabel,
    })

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${exportLog.fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
