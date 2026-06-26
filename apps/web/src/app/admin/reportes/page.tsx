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

type ResultSummary = {
  income: number
  expense: number
  net: number
}

type OverdueInvoice = {
  _id: string
  invoiceNumber: string
  dueDate: string
  totalAmount: number
  daysOverdue: number
  status: 'pendiente' | 'pagada' | 'vencida' | 'anulada'
  updatedAt?: string
  updatedBy?: string
  clientId?: { _id: string; name: string }
  projectId?: { _id: string; name: string; code?: string }
}

type IncomeByClient = {
  _id: string
  total: number
  name: string
  taxId?: string
}

type ExpenseByCategory = {
  _id: string
  total: number
}

type ProjectResult = {
  _id: string
  name: string
  code?: string
  totalIncome: number
  totalExpense: number
  utility: number
  margin: number
}

type CollectionsByClient = {
  _id: string
  pending: number
  overdueCount: number
  name: string
}

type ReportsPayload = {
  cashFlow: CashFlowRow[]
  resultSummary: ResultSummary
  overdueInvoices: OverdueInvoice[]
  incomeByClient: IncomeByClient[]
  expensesByCategory: ExpenseByCategory[]
  projectResults: ProjectResult[]
  collectionsByClient: CollectionsByClient[]
}

const money = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount || 0)
const percent = (value: number) => `${Math.round(value || 0)}%`
const dateValue = (value?: string) => (value ? value.slice(0, 10) : '')
const formatAuditMeta = (updatedBy?: string, updatedAt?: string) => {
  if (!updatedBy && !updatedAt) return ''
  const pieces = ['Ultimo cambio:']
  if (updatedBy) pieces.push(updatedBy)
  if (updatedAt) pieces.push(dateValue(updatedAt))
  return pieces.join(' · ')
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

const emptyReports: ReportsPayload = {
  cashFlow: [],
  resultSummary: { income: 0, expense: 0, net: 0 },
  overdueInvoices: [],
  incomeByClient: [],
  expensesByCategory: [],
  projectResults: [],
  collectionsByClient: [],
}

export default function AdminReportsPage() {
  const { isLoaded, isSignedIn, requestJson } = useApiClient()
  const [reports, setReports] = useState<ReportsPayload>(emptyReports)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [statusSavingKey, setStatusSavingKey] = useState('')
  const [invoiceStatusDrafts, setInvoiceStatusDrafts] = useState<Record<string, OverdueInvoice['status']>>({})

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    requestJson<{ reports: ReportsPayload }>('/api/finance/admin/reports/summary')
      .then((data) => setReports(data?.reports || emptyReports))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No pudimos cargar los reportes'))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, requestJson])

  const reloadReports = async () => {
    const data = await requestJson<{ reports: ReportsPayload }>('/api/finance/admin/reports/summary')
    setReports(data?.reports || emptyReports)
  }

  const updateInvoiceStatus = async (invoice: OverdueInvoice) => {
    try {
      setStatusSavingKey(invoice._id)
      await requestJson(`/api/finance/admin/invoices/${invoice._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: invoiceStatusDrafts[invoice._id] ?? invoice.status }),
      })
      setInvoiceStatusDrafts((current) => {
        const next = { ...current }
        delete next[invoice._id]
        return next
      })
      await reloadReports()
      setMessage('Estado de factura actualizado desde reportes.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos actualizar el estado')
    } finally {
      setStatusSavingKey('')
    }
  }

  const maxCash = useMemo(() => Math.max(...reports.cashFlow.flatMap((row) => [row.income, row.expense, Math.abs(row.net)]), 1), [reports.cashFlow])
  const maxIncomeClient = useMemo(() => Math.max(...reports.incomeByClient.map((row) => row.total), 1), [reports.incomeByClient])
  const maxExpenseCategory = useMemo(() => Math.max(...reports.expensesByCategory.map((row) => row.total), 1), [reports.expensesByCategory])

  const openPdfReport = () => {
    window.open('/admin/reportes/pdf', '_blank', 'noopener,noreferrer')
  }

  return (
    <AdminShell title="Reportes">
      <div className="grid gap-6">
        {message && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">{message}</div>}

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.12),_transparent_36%),linear-gradient(135deg,_#020617_0%,_#0f172a_58%,_#164e63_100%)] px-6 py-7 text-white lg:grid-cols-[1.1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-200">Reporte Ejecutivo</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight">
                Exporta un PDF corporativo con métricas clave, tablas consolidadas y secciones listas para compartir.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                El documento resume caja, rentabilidad, cobranza y facturas vencidas con un formato pensado para dirección, finanzas y seguimiento operativo.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
              <button
                type="button"
                onClick={openPdfReport}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-50"
              >
                <Printer className="h-4 w-4" />
                Abrir PDF general
              </button>
              <p className="text-xs text-slate-300">
                Usa guardar o imprimir desde el navegador para descargarlo en PDF.
              </p>
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
                <p className="text-sm text-slate-500">Comparación de ingresos, egresos y caja neta de los últimos seis meses.</p>
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
              {!reports.cashFlow.length && !loading && <p className="text-sm text-slate-500">Aún no hay datos suficientes para el flujo de caja.</p>}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-slate-800" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Estado de resultados simple</h2>
                <p className="text-sm text-slate-500">Vista compacta de ingresos, egresos y resultado neto acumulado.</p>
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
              {reports.incomeByClient.map((row) => (
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
              {!reports.incomeByClient.length && !loading && <p className="text-sm text-slate-500">Aún no hay ingresos suficientes para agrupar clientes.</p>}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <PieChart className="h-5 w-5 text-rose-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Egresos por categoría</h2>
                <p className="text-sm text-slate-500">Concentración del gasto por rubro operativo.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              {reports.expensesByCategory.map((row) => (
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
              {!reports.expensesByCategory.length && !loading && <p className="text-sm text-slate-500">Aún no hay egresos registrados para agrupar categorías.</p>}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Rentabilidad por proyecto</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4">Proyecto</th>
                    <th className="pb-3 pr-4">Ingresos</th>
                    <th className="pb-3 pr-4">Egresos</th>
                    <th className="pb-3 pr-4">Utilidad</th>
                    <th className="pb-3 pr-4">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.projectResults.map((project) => (
                    <tr key={project._id} className="border-t border-slate-100">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-900">{project.code ? `${project.code} · ` : ''}{project.name}</p>
                      </td>
                      <td className="py-3 pr-4 text-emerald-700 font-semibold">{money(project.totalIncome)}</td>
                      <td className="py-3 pr-4 text-rose-700 font-semibold">{money(project.totalExpense)}</td>
                      <td className={`py-3 pr-4 font-semibold ${project.utility >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(project.utility)}</td>
                      <td className="py-3 pr-4 text-slate-700">{percent(project.margin)}</td>
                    </tr>
                  ))}
                  {!reports.projectResults.length && !loading && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500">Aún no hay proyectos con ingresos y egresos para reportar rentabilidad.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Cobranza por cliente</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4">Cliente</th>
                    <th className="pb-3 pr-4">Por cobrar</th>
                    <th className="pb-3 pr-4">Cuotas vencidas</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.collectionsByClient.map((client) => (
                    <tr key={client._id} className="border-t border-slate-100">
                      <td className="py-3 pr-4 font-semibold text-slate-900">{client.name}</td>
                      <td className="py-3 pr-4 text-slate-700">{money(client.pending)}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${client.overdueCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {client.overdueCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!reports.collectionsByClient.length && !loading && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-sm text-slate-500">Aún no hay cobranza suficiente para agrupar clientes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Facturas vencidas</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Factura</th>
                  <th className="pb-3 pr-4">Cliente</th>
                  <th className="pb-3 pr-4">Proyecto</th>
                  <th className="pb-3 pr-4">Atraso</th>
                  <th className="pb-3 pr-4">Total</th>
                  <th className="pb-3 pr-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {reports.overdueInvoices.map((invoice) => (
                  <tr key={invoice._id} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{invoice.invoiceNumber}</td>
                    <td className="py-3 pr-4 text-slate-700">{invoice.clientId?.name || '-'}</td>
                    <td className="py-3 pr-4 text-slate-700">{invoice.projectId ? `${invoice.projectId.code ? `${invoice.projectId.code} · ` : ''}${invoice.projectId.name}` : '-'}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${invoice.daysOverdue >= 30 ? 'bg-rose-100 text-rose-700' : invoice.daysOverdue >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {invoice.daysOverdue} días
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{money(invoice.totalAmount)}</td>
                    <td className="py-3 pr-4">
                      <InlineStatusEditor
                        value={invoiceStatusDrafts[invoice._id] ?? invoice.status}
                        options={[
                          { value: 'pendiente', label: 'Pendiente' },
                          { value: 'pagada', label: 'Pagada' },
                          { value: 'vencida', label: 'Vencida' },
                          { value: 'anulada', label: 'Anulada' },
                        ]}
                        onChange={(value) => setInvoiceStatusDrafts((current) => ({ ...current, [invoice._id]: value as OverdueInvoice['status'] }))}
                        onSave={() => updateInvoiceStatus(invoice)}
                        saving={statusSavingKey === invoice._id}
                        meta={formatAuditMeta(invoice.updatedBy, invoice.updatedAt)}
                      />
                    </td>
                  </tr>
                ))}
                {!reports.overdueInvoices.length && !loading && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-slate-500">No hay facturas vencidas para reportar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  )
}

function ReportKpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: string }) {
  return (
    <article className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-300">{label}</p>
        <div className={`rounded-2xl ${tone} p-2`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-6 text-3xl font-black tracking-tight">{value}</p>
    </article>
  )
}

function ResultRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent}`}>{value}</p>
    </div>
  )
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span>{money(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(8, Math.round(value / max * 100))}%` }} />
      </div>
    </div>
  )
}

function InlineStatusEditor({
  value,
  options,
  onChange,
  onSave,
  saving,
  meta,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  onSave: () => void
  saving: boolean
  meta?: string
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-slate-950 px-2 py-1 text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? '...' : 'OK'}
        </button>
      </div>
      {meta ? <p className="text-[11px] text-slate-500">{meta}</p> : null}
    </div>
  )
}
