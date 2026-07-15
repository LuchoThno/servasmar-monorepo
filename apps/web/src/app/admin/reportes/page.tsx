'use client'

import { AlertTriangle, BarChart3, Building2, LineChart, PieChart, Printer, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useApiClient } from '@/lib/useApiClient'

type CashFlowRow = {
  month: string
  income: number
  expense: number
  net: number
}

type ReportsPayload = {
  cashFlow: CashFlowRow[]
  resultSummary: { income: number; expense: number; net: number }
  overdueInvoices: Array<{
    _id: string
    invoiceNumber: string
    dueDate: string
    totalAmount: number
    daysOverdue: number
    status: 'pendiente' | 'pagada' | 'vencida' | 'anulada'
    clientId?: { name: string }
    projectId?: { name: string; code?: string }
  }>
  incomeByClient: Array<{ _id: string; total: number; name: string; taxId?: string }>
  expensesByCategory: Array<{ _id: string; total: number }>
  projectResults: Array<{
    _id: string
    name: string
    code?: string
    totalIncome: number
    totalExpense: number
    utility: number
    margin: number
  }>
  collectionsByClient: Array<{ _id: string; pending: number; overdueCount: number; name: string }>
}

const emptyReports: ReportsPayload = {
  cashFlow: [],
  resultSummary: { income: 0, expense: 0, net: 0 },
  overdueInvoices: [],
  incomeByClient: [],
  expensesByCategory: [],
  projectResults: [],
  collectionsByClient: [],
}

const expenseCategoryLabels: Record<string, string> = {
  honorarios: 'Honorarios',
  transporte: 'Transporte',
  combustible: 'Combustible',
  hospedaje: 'Hospedaje',
  alimentacion: 'Alimentación',
  equipamiento: 'Equipamiento',
  software: 'Software',
  marketing: 'Marketing',
  servicios_externos: 'Servicios externos',
  permisos: 'Permisos',
  impuestos: 'Impuestos',
  otros: 'Otros',
}

const money = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount || 0)
const percent = (value: number) => `${Math.round(value || 0)}%`
const dateValue = (value?: string) => (value ? new Intl.DateTimeFormat('es-CL').format(new Date(value)) : '-')

export default function AdminReportsPage() {
  const { authorizedFetch, isLoaded, isSignedIn, requestJson } = useApiClient()
  const [reports, setReports] = useState<ReportsPayload>(emptyReports)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    requestJson<{ reports: ReportsPayload }>('/api/finance/admin/reports/summary')
      .then((data) => setReports(data?.reports || emptyReports))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No pudimos cargar los reportes'))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, requestJson])

  const maxCash = useMemo(() => Math.max(...reports.cashFlow.flatMap((row) => [row.income, row.expense, Math.abs(row.net)]), 1), [reports.cashFlow])
  const maxIncomeClient = useMemo(() => Math.max(...reports.incomeByClient.map((row) => row.total), 1), [reports.incomeByClient])
  const maxExpenseCategory = useMemo(() => Math.max(...reports.expensesByCategory.map((row) => row.total), 1), [reports.expensesByCategory])

  const openPdfReport = async () => {
    const response = await authorizedFetch('/api/admin/reportes/pdf')
    const { downloadFileResponse } = await import('@/lib/downloadFile')
    await downloadFileResponse(response, 'servasmar-reportes.pdf')
  }

  return (
    <AdminShell title="Reportes">
      <div className="grid gap-6">
        {message && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">{message}</div>}

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.12),_transparent_36%),linear-gradient(135deg,_#020617_0%,_#0f172a_58%,_#164e63_100%)] px-6 py-7 text-white lg:grid-cols-[1.15fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-200">Reporte Ejecutivo</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight">Vista consolidada de caja, rentabilidad, cobranza y exposición vencida.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Este módulo separa los reportes de la operación diaria para facilitar comités, seguimiento ejecutivo y exportación de PDF.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={openPdfReport}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-50"
              >
                <Printer className="h-4 w-4" />
                Abrir PDF reportes
              </button>
              <p className="text-xs text-slate-300">Listo para descargar o compartir desde impresión del navegador.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ReportKpi label="Ingresos 6 meses" value={money(reports.resultSummary.income)} icon={TrendingUp} tone="bg-emerald-600" />
          <ReportKpi label="Egresos 6 meses" value={money(reports.resultSummary.expense)} icon={PieChart} tone="bg-rose-600" />
          <ReportKpi label="Resultado neto" value={money(reports.resultSummary.net)} icon={LineChart} tone="bg-blue-600" />
          <ReportKpi label="Facturas vencidas" value={String(reports.overdueInvoices.length)} icon={AlertTriangle} tone="bg-amber-500" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <LineChart className="h-5 w-5 text-blue-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Flujo de caja mensual</h2>
                <p className="text-sm text-slate-500">Comparación compacta de ingresos, egresos y neto de los últimos seis meses.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              {reports.cashFlow.map((row) => (
                <div key={row.month} className="grid gap-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>{row.month}</span>
                    <span>{money(row.net)}</span>
                  </div>
                  <div className="grid gap-2">
                    <Bar label="Ingresos" value={row.income} max={maxCash} color="bg-emerald-500" />
                    <Bar label="Egresos" value={row.expense} max={maxCash} color="bg-rose-500" />
                  </div>
                </div>
              ))}
              {!reports.cashFlow.length && !loading && <EmptyLine text="Aún no hay datos suficientes para el flujo de caja." />}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-slate-800" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Estado de resultados simple</h2>
                <p className="text-sm text-slate-500">Lectura rápida de ingresos, egresos y resultado neto acumulado.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              <ResultRow label="Ingresos acumulados" value={money(reports.resultSummary.income)} accent="text-emerald-700" />
              <ResultRow label="Egresos acumulados" value={money(reports.resultSummary.expense)} accent="text-rose-700" />
              <ResultRow label="Resultado neto" value={money(reports.resultSummary.net)} accent={reports.resultSummary.net >= 0 ? 'text-emerald-700' : 'text-rose-700'} />
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-emerald-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Ingresos por cliente</h2>
                <p className="text-sm text-slate-500">Clientes con mayor ingreso acumulado registrado.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              {reports.incomeByClient.slice(0, 8).map((row) => (
                <div key={row._id} className="grid gap-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>{row.name}</span>
                    <span>{money(row.total)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(8, Math.round(row.total / maxIncomeClient * 100))}%` }} />
                  </div>
                </div>
              ))}
              {!reports.incomeByClient.length && !loading && <EmptyLine text="Aún no hay ingresos suficientes para construir este ranking." />}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <PieChart className="h-5 w-5 text-rose-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Egresos por categoría</h2>
                <p className="text-sm text-slate-500">Concentración de costo por rubro operativo.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              {reports.expensesByCategory.slice(0, 8).map((row) => (
                <div key={row._id} className="grid gap-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>{expenseCategoryLabels[row._id] || row._id}</span>
                    <span>{money(row.total)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(8, Math.round(row.total / maxExpenseCategory * 100))}%` }} />
                  </div>
                </div>
              ))}
              {!reports.expensesByCategory.length && !loading && <EmptyLine text="Aún no hay egresos suficientes para analizar categorías." />}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Rentabilidad por proyecto</h2>
                <p className="text-sm text-slate-500">Proyectos y servicios con mejor utilidad y margen.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {reports.projectResults.slice(0, 8).map((project) => (
                <div key={project._id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{project.code ? `${project.code} · ` : ''}{project.name}</p>
                      <p className="mt-1 text-sm text-slate-500">Ingresos {money(project.totalIncome)} · Egresos {money(project.totalExpense)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-black ${project.utility >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(project.utility)}</p>
                      <p className="text-xs text-slate-500">Margen {percent(project.margin)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!reports.projectResults.length && !loading && <EmptyLine text="Sin datos suficientes para rentabilidad por proyecto." />}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Cobranza pendiente por cliente</h2>
                <p className="text-sm text-slate-500">Exposición actual y cantidad de casos vencidos.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {reports.collectionsByClient.slice(0, 8).map((row) => (
                <div key={row._id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{row.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{row.overdueCount} documento(s) vencido(s)</p>
                    </div>
                    <p className="font-black text-amber-700">{money(row.pending)}</p>
                  </div>
                </div>
              ))}
              {!reports.collectionsByClient.length && !loading && <EmptyLine text="No hay cartera pendiente por cliente." />}
            </div>
          </article>
        </section>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-700" />
            <div>
              <h2 className="text-lg font-bold text-slate-950">Facturas vencidas</h2>
              <p className="text-sm text-slate-500">Detalle priorizado para seguimiento y comité de cobranza.</p>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Factura</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3">Proyecto</th>
                  <th className="px-3 py-3">Vence</th>
                  <th className="px-3 py-3">Mora</th>
                  <th className="px-3 py-3">Monto</th>
                </tr>
              </thead>
              <tbody>
                {reports.overdueInvoices.slice(0, 12).map((invoice) => (
                  <tr key={invoice._id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-950">{invoice.invoiceNumber}</td>
                    <td className="px-3 py-3">{invoice.clientId?.name || '-'}</td>
                    <td className="px-3 py-3">{invoice.projectId?.code ? `${invoice.projectId.code} · ` : ''}{invoice.projectId?.name || '-'}</td>
                    <td className="px-3 py-3">{dateValue(invoice.dueDate)}</td>
                    <td className="px-3 py-3 text-rose-700">{invoice.daysOverdue} días</td>
                    <td className="px-3 py-3 font-semibold text-slate-950">{money(invoice.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!reports.overdueInvoices.length && !loading && <div className="py-6 text-sm text-slate-500">Sin facturas vencidas.</div>}
          </div>
        </article>
      </div>
    </AdminShell>
  )
}

function ReportKpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof TrendingUp
  tone: string
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-2xl p-3 text-white ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
    </article>
  )
}

function ResultRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className={`text-lg font-black ${accent}`}>{value}</p>
    </div>
  )
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{money(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(8, Math.round(value / max * 100))}%` }} />
      </div>
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">{text}</p>
}
