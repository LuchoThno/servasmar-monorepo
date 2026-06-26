'use client'

import { Printer } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
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

const company = {
  name: 'SERVASMAR',
  legal: 'Asesorías y soluciones marítimas, portuarias y costeras',
  rut: '77.505.416-6',
  email: 'contacto@servasmar.cl',
  website: 'www.servasmar.cl',
  location: 'Chile',
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

const money = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount || 0)
const percent = (value: number) => `${Math.round(value || 0)}%`
const dateValue = (value?: string) =>
  value ? new Intl.DateTimeFormat('es-CL').format(new Date(value)) : '-'
const generatedAt = () =>
  new Intl.DateTimeFormat('es-CL', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())

export default function ReportsPdfPage() {
  const { authHeaders, isLoaded, isSignedIn } = useApiClient()
  const [reports, setReports] = useState<ReportsPayload>(emptyReports)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const loadReports = async () => {
      try {
        const response = await fetch('/api/finance/admin/reports/summary', {
          headers: await authHeaders(),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error?.message || 'No pudimos cargar el reporte general')
        setReports(data.reports || emptyReports)
      } catch (currentError) {
        setError(currentError instanceof Error ? currentError.message : 'No pudimos cargar el reporte general')
      }
    }

    loadReports()
  }, [authHeaders, isLoaded, isSignedIn])

  const executiveHighlights = useMemo(() => {
    const topClient = reports.incomeByClient[0]
    const topProject = [...reports.projectResults].sort((a, b) => b.utility - a.utility)[0]
    const overdueTotal = reports.overdueInvoices.reduce((total, invoice) => total + invoice.totalAmount, 0)

    return [
      {
        label: 'Cliente líder en ingresos',
        value: topClient ? `${topClient.name} · ${money(topClient.total)}` : 'Sin datos suficientes',
      },
      {
        label: 'Proyecto con mayor utilidad',
        value: topProject
          ? `${topProject.code ? `${topProject.code} · ` : ''}${topProject.name} · ${money(topProject.utility)}`
          : 'Sin datos suficientes',
      },
      {
        label: 'Exposición en facturas vencidas',
        value: reports.overdueInvoices.length ? `${money(overdueTotal)} en ${reports.overdueInvoices.length} facturas` : 'Sin facturas vencidas',
      },
    ]
  }, [reports])

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-red-700">
        {error}
      </main>
    )
  }

  const hasLoadedData = isLoaded && isSignedIn
  if (!hasLoadedData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-700">
        Cargando reporte general...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#e8edf3] px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <style jsx global>{`
        @page {
          size: letter;
          margin: 0.42in;
        }

        @media print {
          .no-print { display: none !important; }
          html, body {
            background: white !important;
            width: 100% !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0 !important;
          }
          .print-page {
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            margin: 0 auto !important;
            max-width: none !important;
            width: 100% !important;
            padding: 0 !important;
          }
          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-table {
            table-layout: fixed !important;
            font-size: 10px !important;
          }
          .print-table th,
          .print-table td {
            padding: 7px 8px !important;
          }
          .print-wrap {
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[8.5in] justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800"
        >
          <Printer className="h-4 w-4" />
          Guardar / imprimir PDF
        </button>
      </div>

      <section className="print-page mx-auto w-full max-w-[8.5in] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <header className="print-avoid-break bg-[linear-gradient(135deg,_#020617_0%,_#0f172a_58%,_#155e75_100%)] px-8 py-8 text-white">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <Image src="/images/logo2.png" alt="SERVASMAR" width={70} height={70} className="h-[70px] w-[70px] object-contain" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-cyan-200">Reporte General</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight">{company.name}</h1>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">{company.legal}</p>
                <div className="mt-4 grid gap-1 text-xs text-slate-300">
                  <span>{company.rut}</span>
                  <span>{company.email}</span>
                  <span>{company.website}</span>
                  <span>{company.location}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-200">Resumen Ejecutivo</p>
              <div className="mt-4 grid gap-3">
                {[
                  { label: 'Generado', value: generatedAt() },
                  { label: 'Ingresos 6 meses', value: money(reports.resultSummary.income) },
                  { label: 'Egresos 6 meses', value: money(reports.resultSummary.expense) },
                  { label: 'Resultado neto', value: money(reports.resultSummary.net) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-b border-white/10 pb-3 text-sm last:border-b-0 last:pb-0">
                    <span className="text-slate-300">{label}</span>
                    <strong className="text-right text-white">{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-8 py-7">
          <section className="print-avoid-break rounded-[24px] border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-700">Lectura Rápida</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">Conclusiones principales del período</h2>
              </div>
              <div className={`rounded-full px-4 py-2 text-xs font-bold ${reports.resultSummary.net >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {reports.resultSummary.net >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {executiveHighlights.map((item) => (
                <article key={item.label} className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{item.value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4 print-avoid-break">
            <KpiCard label="Ingresos" value={money(reports.resultSummary.income)} tone="emerald" />
            <KpiCard label="Egresos" value={money(reports.resultSummary.expense)} tone="rose" />
            <KpiCard label="Resultado neto" value={money(reports.resultSummary.net)} tone={reports.resultSummary.net >= 0 ? 'blue' : 'amber'} />
            <KpiCard label="Facturas vencidas" value={String(reports.overdueInvoices.length)} tone="slate" />
          </section>

          <ReportSection
            eyebrow="Sección 1"
            title="Flujo de caja mensual"
            description="Detalle de ingresos, egresos y caja neta de los últimos seis meses, ordenado por período."
          >
            <DataTable
              headers={['Mes', 'Ingresos', 'Egresos', 'Caja neta']}
              rows={reports.cashFlow.map((row) => [
                row.month,
                money(row.income),
                money(row.expense),
                money(row.net),
              ])}
              emptyMessage="Aún no hay datos suficientes para el flujo de caja."
            />
          </ReportSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportSection
              eyebrow="Sección 2"
              title="Ingresos por cliente"
              description="Clientes con mayor contribución económica acumulada."
            >
              <DataTable
                headers={['Cliente', 'RUT', 'Ingresos']}
                rows={reports.incomeByClient.map((row) => [row.name, row.taxId || '-', money(row.total)])}
                emptyMessage="Aún no hay ingresos suficientes para agrupar clientes."
              />
            </ReportSection>

            <ReportSection
              eyebrow="Sección 3"
              title="Egresos por categoría"
              description="Distribución del gasto operativo por rubro."
            >
              <DataTable
                headers={['Categoría', 'Monto']}
                rows={reports.expensesByCategory.map((row) => [expenseCategoryLabels[row._id] || row._id, money(row.total)])}
                emptyMessage="Aún no hay egresos registrados para agrupar categorías."
              />
            </ReportSection>
          </div>

          <ReportSection
            eyebrow="Sección 4"
            title="Rentabilidad por proyecto"
            description="Comparativo de ingresos, egresos, utilidad y margen para proyectos con data financiera."
          >
            <DataTable
              headers={['Proyecto', 'Ingresos', 'Egresos', 'Utilidad', 'Margen']}
              rows={reports.projectResults.map((project) => [
                `${project.code ? `${project.code} · ` : ''}${project.name}`,
                money(project.totalIncome),
                money(project.totalExpense),
                money(project.utility),
                percent(project.margin),
              ])}
              emptyMessage="Aún no hay proyectos con ingresos y egresos para reportar rentabilidad."
            />
          </ReportSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportSection
              eyebrow="Sección 5"
              title="Cobranza por cliente"
              description="Cartera por cobrar y concentración de cuotas vencidas."
            >
              <DataTable
                headers={['Cliente', 'Por cobrar', 'Cuotas vencidas']}
                rows={reports.collectionsByClient.map((client) => [
                  client.name,
                  money(client.pending),
                  String(client.overdueCount),
                ])}
                emptyMessage="Aún no hay cobranza suficiente para agrupar clientes."
              />
            </ReportSection>

            <ReportSection
              eyebrow="Sección 6"
              title="Facturas vencidas"
              description="Documentos con atraso para seguimiento inmediato."
            >
              <DataTable
                headers={['Factura', 'Cliente', 'Proyecto', 'Atraso', 'Total', 'Vencimiento']}
                rows={reports.overdueInvoices.map((invoice) => [
                  invoice.invoiceNumber,
                  invoice.clientId?.name || '-',
                  invoice.projectId ? `${invoice.projectId.code ? `${invoice.projectId.code} · ` : ''}${invoice.projectId.name}` : '-',
                  `${invoice.daysOverdue} días`,
                  money(invoice.totalAmount),
                  dateValue(invoice.dueDate),
                ])}
                emptyMessage="No hay facturas vencidas para reportar."
              />
            </ReportSection>
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 px-8 py-5 text-center text-[11px] leading-6 text-slate-500">
          Documento generado desde el módulo de reportes de SERVASMAR. Este PDF consolida indicadores operativos y financieros para revisión interna, dirección y seguimiento comercial.
        </footer>
      </section>
    </main>
  )
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'emerald' | 'rose' | 'blue' | 'amber' | 'slate'
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tone === 'rose'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : tone === 'blue'
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : tone === 'amber'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-slate-50 text-slate-700 border-slate-200'

  return (
    <article className={`rounded-[22px] border p-5 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.25em]">{label}</p>
      <p className="mt-4 text-2xl font-black tracking-tight">{value}</p>
    </article>
  )
}

function ReportSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="print-avoid-break rounded-[24px] border border-slate-200 bg-white p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-700">{eyebrow}</p>
      <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function DataTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[]
  rows: string[][]
  emptyMessage: string
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-200">
      <table className="print-table min-w-full border-collapse text-left text-sm">
        <thead className="bg-slate-950 text-white">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/65">
              {row.map((cell, cellIndex) => (
                <td
                  key={`${headers[cellIndex]}-${rowIndex}`}
                  className={`print-wrap px-4 py-3 align-top text-slate-700 ${cellIndex === 0 ? 'font-semibold text-slate-900' : ''}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
