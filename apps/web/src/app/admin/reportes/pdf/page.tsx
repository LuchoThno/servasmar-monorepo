'use client'

import { Printer } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useApiClient } from '@/lib/useApiClient'

type ReportsPayload = {
  cashFlow: Array<{ month: string; income: number; expense: number; net: number }>
  resultSummary: { income: number; expense: number; net: number }
  overdueInvoices: Array<{
    _id: string
    invoiceNumber: string
    dueDate: string
    totalAmount: number
    daysOverdue: number
    clientId?: { name: string }
    projectId?: { name: string; code?: string }
  }>
  incomeByClient: Array<{ _id: string; total: number; name: string }>
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

const company = {
  name: 'SERVASMAR',
  legal: 'Asesorías y soluciones marítimas, portuarias y costeras',
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

const money = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount || 0)
const percent = (value: number) => `${Math.round(value || 0)}%`
const dateValue = (value?: string) => (value ? new Intl.DateTimeFormat('es-CL').format(new Date(value)) : '-')
const generatedAt = () => new Intl.DateTimeFormat('es-CL', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())

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
        value: topProject ? `${topProject.code ? `${topProject.code} · ` : ''}${topProject.name} · ${money(topProject.utility)}` : 'Sin datos suficientes',
      },
      {
        label: 'Exposición en facturas vencidas',
        value: reports.overdueInvoices.length ? `${money(overdueTotal)} en ${reports.overdueInvoices.length} factura(s)` : 'Sin facturas vencidas',
      },
    ]
  }, [reports])

  if (error) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-red-700">{error}</main>
  }

  if (!isLoaded || !isSignedIn) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-700">Cargando reporte general...</main>
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
          html, body { background: white !important; width: 100% !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0 !important; }
          .print-page { box-shadow: none !important; border: 0 !important; border-radius: 0 !important; max-width: none !important; width: 100% !important; padding: 0 !important; }
          .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .print-table th, .print-table td { padding: 7px 8px !important; }
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
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <Image src="/images/logo2.png" alt="SERVASMAR" width={70} height={70} className="h-[70px] w-[70px] object-contain" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-cyan-200">Reporte General</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight">{company.name}</h1>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">{company.legal}</p>
                <div className="mt-4 grid gap-1 text-xs text-slate-300">
                  <span>{company.email}</span>
                  <span>{company.website}</span>
                  <span>{company.location}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-200">Resumen Ejecutivo</p>
              <div className="mt-4 grid gap-3">
                {executiveHighlights.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-300">Generado: {generatedAt()}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 px-8 py-8">
          <section className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Ingresos acumulados" value={money(reports.resultSummary.income)} />
            <MetricCard label="Egresos acumulados" value={money(reports.resultSummary.expense)} />
            <MetricCard label="Resultado neto" value={money(reports.resultSummary.net)} />
          </section>

          <section className="print-avoid-break rounded-3xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-950">Flujo de caja resumido</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="print-table min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mes</th>
                    <th className="px-4 py-3">Ingresos</th>
                    <th className="px-4 py-3">Egresos</th>
                    <th className="px-4 py-3">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.cashFlow.map((row) => (
                    <tr key={row.month} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold">{row.month}</td>
                      <td className="px-4 py-3">{money(row.income)}</td>
                      <td className="px-4 py-3">{money(row.expense)}</td>
                      <td className="px-4 py-3 font-semibold">{money(row.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <PrintList
              title="Ingresos por cliente"
              rows={reports.incomeByClient.slice(0, 8).map((row) => ({
                label: row.name,
                value: money(row.total),
              }))}
            />
            <PrintList
              title="Egresos por categoría"
              rows={reports.expensesByCategory.slice(0, 8).map((row) => ({
                label: expenseCategoryLabels[row._id] || row._id,
                value: money(row.total),
              }))}
            />
          </section>

          <section className="print-avoid-break rounded-3xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-950">Rentabilidad por proyecto</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="print-table min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Proyecto</th>
                    <th className="px-4 py-3">Ingresos</th>
                    <th className="px-4 py-3">Egresos</th>
                    <th className="px-4 py-3">Utilidad</th>
                    <th className="px-4 py-3">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.projectResults.slice(0, 10).map((project) => (
                    <tr key={project._id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold">{project.code ? `${project.code} · ` : ''}{project.name}</td>
                      <td className="px-4 py-3">{money(project.totalIncome)}</td>
                      <td className="px-4 py-3">{money(project.totalExpense)}</td>
                      <td className="px-4 py-3">{money(project.utility)}</td>
                      <td className="px-4 py-3">{percent(project.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="print-avoid-break rounded-3xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-950">Facturas vencidas</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="print-table min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Factura</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Proyecto</th>
                    <th className="px-4 py-3">Vence</th>
                    <th className="px-4 py-3">Mora</th>
                    <th className="px-4 py-3">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.overdueInvoices.slice(0, 12).map((invoice) => (
                    <tr key={invoice._id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3">{invoice.clientId?.name || '-'}</td>
                      <td className="px-4 py-3">{invoice.projectId?.code ? `${invoice.projectId.code} · ` : ''}{invoice.projectId?.name || '-'}</td>
                      <td className="px-4 py-3">{dateValue(invoice.dueDate)}</td>
                      <td className="px-4 py-3">{invoice.daysOverdue} días</td>
                      <td className="px-4 py-3 font-semibold">{money(invoice.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
    </article>
  )
}

function PrintList({ title, rows }: { title: string; rows: Array<{ label: string; value: string }> }) {
  return (
    <section className="print-avoid-break rounded-3xl border border-slate-200 p-5">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
            <p className="text-sm text-slate-700">{row.label}</p>
            <p className="text-sm font-semibold text-slate-950">{row.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
