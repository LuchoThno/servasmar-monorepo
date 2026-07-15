import { NextRequest } from 'next/server'
import { requirePermission } from '@/app/api/_lib/auth'
import { toErrorResponse } from '@/app/api/_lib/apiError'
import { createAdminPdfDocument, drawReportHeader, drawSectionTitle, drawTable, pdfToBuffer } from '@/lib/server/adminPdf'
import { loadReportsPdfData, expenseCategoryLabels } from '@/lib/server/adminPdfData'
import { registerPdfExport } from '@/lib/server/adminPdfLog'

export const runtime = 'nodejs'

const money = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount || 0)
const percent = (value: number) => `${Math.round(value || 0)}%`
const dateValue = (value?: string) => (value ? new Intl.DateTimeFormat('es-CL').format(new Date(value)) : '-')

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const data = await loadReportsPdfData()
    const exportLog = await registerPdfExport('reportes', authorized, {
      rows: {
        cashFlow: data.cashFlow.length,
        overdueInvoices: data.overdueInvoices.length,
        projectResults: data.projectResults.length,
      },
    })

    const topClient = data.incomeByClient[0]
    const topProject = [...data.projectResults].sort((a, b) => b.utility - a.utility)[0]
    const doc = createAdminPdfDocument('SERVASMAR - Reportes ejecutivos')

    drawReportHeader(doc, {
      title: 'Reportes Ejecutivos',
      subtitle: 'Consolidado financiero y comercial para comites y seguimiento directivo.',
      sequenceLabel: exportLog.sequenceLabel,
      exportId: exportLog.exportId,
    })

    drawSectionTitle(doc, 'Resumen clave', 'Indicadores principales del modulo de reportes.')
    drawTable(
      doc,
      [
        { key: 'metric', label: 'Indicador', width: 220 },
        { key: 'value', label: 'Valor', width: 295 },
      ],
      [
        { metric: 'Ingresos acumulados', value: money(data.resultSummary.income) },
        { metric: 'Egresos acumulados', value: money(data.resultSummary.expense) },
        { metric: 'Resultado neto', value: money(data.resultSummary.net) },
        { metric: 'Facturas vencidas', value: String(data.overdueInvoices.length) },
        { metric: 'Cliente principal', value: topClient ? `${topClient.name} · ${money(topClient.total)}` : 'Sin datos' },
        { metric: 'Proyecto destacado', value: topProject ? `${topProject.code ? `${topProject.code} · ` : ''}${topProject.name}` : 'Sin datos' },
      ]
    )

    drawSectionTitle(doc, 'Flujo de caja 6 meses', 'Serie ejecutiva de ingresos, egresos y neto mensual.')
    drawTable(
      doc,
      [
        { key: 'month', label: 'Mes', width: 110 },
        { key: 'income', label: 'Ingresos', width: 135, align: 'right' },
        { key: 'expense', label: 'Egresos', width: 135, align: 'right' },
        { key: 'net', label: 'Neto', width: 135, align: 'right' },
      ],
      data.cashFlow.map((row) => ({
        month: row.month,
        income: money(row.income),
        expense: money(row.expense),
        net: money(row.net),
      }))
    )

    drawSectionTitle(doc, 'Ingresos por cliente', 'Clientes con mayor participacion en los ingresos registrados.')
    drawTable(
      doc,
      [
        { key: 'name', label: 'Cliente', width: 360 },
        { key: 'total', label: 'Ingreso', width: 155, align: 'right' },
      ],
      data.incomeByClient.map((row) => ({ name: row.name, total: money(row.total) }))
    )

    drawSectionTitle(doc, 'Egresos por categoria', 'Principales categorias de costo observadas en el periodo.')
    drawTable(
      doc,
      [
        { key: 'category', label: 'Categoria', width: 360 },
        { key: 'total', label: 'Monto', width: 155, align: 'right' },
      ],
      data.expensesByCategory.map((row) => ({
        category: expenseCategoryLabels[row._id] || row._id,
        total: money(row.total),
      }))
    )

    drawSectionTitle(doc, 'Rentabilidad por proyecto', 'Proyectos con mayor incidencia en utilidad y margen.')
    drawTable(
      doc,
      [
        { key: 'project', label: 'Proyecto', width: 185 },
        { key: 'income', label: 'Ingresos', width: 95, align: 'right' },
        { key: 'expense', label: 'Egresos', width: 95, align: 'right' },
        { key: 'utility', label: 'Utilidad', width: 90, align: 'right' },
        { key: 'margin', label: 'Margen', width: 50, align: 'right' },
      ],
      data.projectResults.map((project) => ({
        project: `${project.code ? `${project.code} · ` : ''}${project.name}`,
        income: money(project.totalIncome),
        expense: money(project.totalExpense),
        utility: money(project.utility),
        margin: percent(project.margin),
      }))
    )

    drawSectionTitle(doc, 'Facturas vencidas', 'Exposicion vencida priorizada para gestion comercial y financiera.')
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

    const buffer = await pdfToBuffer(doc, {
      downloadedBy: authorized.email,
      generatedAt: exportLog.generatedAt,
      documentType: 'Reportes',
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
