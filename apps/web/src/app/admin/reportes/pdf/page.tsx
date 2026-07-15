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
  legal: 'Consultoría marítima, portuaria y costera',
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
  alimentacion: 'Alimentacion',
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
const generatedAt = () => new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())

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

  const executiveMetrics = useMemo(() => {
    const overdueAmount = reports.overdueInvoices.reduce((total, invoice) => total + invoice.totalAmount, 0)
    const topClient = reports.incomeByClient[0]
    const topProject = [...reports.projectResults].sort((a, b) => b.utility - a.utility)[0]
    const averageMargin = reports.projectResults.length
      ? reports.projectResults.reduce((total, project) => total + project.margin, 0) / reports.projectResults.length
      : 0

    return [
      { label: 'Ingresos acumulados', value: money(reports.resultSummary.income) },
      { label: 'Resultado neto', value: money(reports.resultSummary.net) },
      { label: 'Facturas vencidas', value: reports.overdueInvoices.length ? `${reports.overdueInvoices.length} · ${money(overdueAmount)}` : 'Sin vencimientos' },
      { label: 'Margen promedio', value: percent(averageMargin) },
      { label: 'Cliente principal', value: topClient ? `${topClient.name} · ${money(topClient.total)}` : 'Sin datos' },
      {
        label: 'Proyecto destacado',
        value: topProject ? `${topProject.code ? `${topProject.code} · ` : ''}${topProject.name}` : 'Sin datos',
      },
    ]
  }, [reports])

  const collectionRows = useMemo(
    () =>
      reports.collectionsByClient.slice(0, 6).map((row) => [
        row.name,
        money(row.pending),
        `${row.overdueCount} caso(s)`,
      ]),
    [reports.collectionsByClient]
  )

  if (error) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-red-700">{error}</main>
  }

  if (!isLoaded || !isSignedIn) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-700">Cargando reporte general...</main>
  }

  return (
    <main className="min-h-screen bg-[#eef2f6] px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <style jsx global>{`
        @page {
          size: letter;
          margin: 0.45in;
        }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; width: 100% !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0 !important; }
          .print-page { box-shadow: none !important; border: 0 !important; border-radius: 0 !important; max-width: none !important; width: 100% !important; }
          .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .print-table th, .print-table td { padding: 8px 10px !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[8.5in] justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" />
          Guardar / imprimir PDF
        </button>
      </div>

      <section className="print-page mx-auto w-full max-w-[8.5in] rounded-[24px] border border-slate-200 bg-white shadow-xl">
        <header className="border-b border-slate-200 px-8 py-7">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <Image src="/images/logo2.png" alt="SERVASMAR" width={64} height={64} className="h-16 w-16 object-contain" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Reporte ejecutivo</p>
                <h1 className="mt-2 text-[28px] font-black tracking-tight text-slate-950">{company.name}</h1>
                <p className="mt-1 text-sm text-slate-600">{company.legal}</p>
              </div>
            </div>

            <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">Generado:</span> {generatedAt()}</p>
              <p className="mt-1"><span className="font-semibold text-slate-900">Correo:</span> {company.email}</p>
              <p className="mt-1"><span className="font-semibold text-slate-900">Web:</span> {company.website}</p>
              <p className="mt-1"><span className="font-semibold text-slate-900">Cobertura:</span> {company.location}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 px-8 py-7">
          <SectionCard title="Resumen de gestión" subtitle="Indicadores clave para lectura ejecutiva y seguimiento financiero.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {executiveMetrics.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{metric.value}</p>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Estado de resultados" subtitle="Consolidado simple de ingresos, egresos y resultado del periodo visible.">
            <DataTable
              headers={['Concepto', 'Monto']}
              rows={[
                ['Ingresos acumulados', money(reports.resultSummary.income)],
                ['Egresos acumulados', money(reports.resultSummary.expense)],
                ['Resultado neto', money(reports.resultSummary.net)],
              ]}
            />
          </SectionCard>

          <SectionCard title="Flujo de caja mensual" subtitle="Lectura compacta para control de ingresos, egresos y variacion neta por mes.">
            <DataTable
              headers={['Mes', 'Ingresos', 'Egresos', 'Neto']}
              rows={reports.cashFlow.map((row) => [
                row.month,
                money(row.income),
                money(row.expense),
                money(row.net),
              ])}
              emptyText="Aun no hay datos suficientes para el flujo de caja."
            />
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Ingresos por cliente" subtitle="Clientes con mayor participacion en los ingresos registrados.">
              <DataTable
                headers={['Cliente', 'Ingreso']}
                rows={reports.incomeByClient.slice(0, 8).map((row) => [row.name, money(row.total)])}
                emptyText="Aun no hay ingresos suficientes para construir este ranking."
              />
            </SectionCard>

            <SectionCard title="Egresos por categoria" subtitle="Distribucion principal de costos operativos.">
              <DataTable
                headers={['Categoria', 'Monto']}
                rows={reports.expensesByCategory.slice(0, 8).map((row) => [expenseCategoryLabels[row._id] || row._id, money(row.total)])}
                emptyText="Aun no hay egresos suficientes para analizar categorias."
              />
            </SectionCard>
          </div>

          <SectionCard title="Rentabilidad por proyecto" subtitle="Comparativo ejecutivo de ingresos, egresos, utilidad y margen.">
            <DataTable
              headers={['Proyecto', 'Ingresos', 'Egresos', 'Utilidad', 'Margen']}
              rows={reports.projectResults.slice(0, 10).map((project) => [
                `${project.code ? `${project.code} · ` : ''}${project.name}`,
                money(project.totalIncome),
                money(project.totalExpense),
                money(project.utility),
                percent(project.margin),
              ])}
              emptyText="Sin datos suficientes para rentabilidad por proyecto."
            />
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Cobranza pendiente por cliente" subtitle="Clientes con exposicion activa y casos vencidos asociados.">
              <DataTable
                headers={['Cliente', 'Pendiente', 'Vencidos']}
                rows={collectionRows}
                emptyText="Sin cobranza pendiente registrada."
              />
            </SectionCard>

            <SectionCard title="Facturas vencidas" subtitle="Documentos que requieren seguimiento prioritario.">
              <DataTable
                headers={['Factura', 'Cliente', 'Vence', 'Mora', 'Monto']}
                rows={reports.overdueInvoices.slice(0, 10).map((invoice) => [
                  invoice.invoiceNumber,
                  invoice.clientId?.name || '-',
                  dateValue(invoice.dueDate),
                  `${invoice.daysOverdue} dias`,
                  money(invoice.totalAmount),
                ])}
                emptyText="No existen facturas vencidas al momento del reporte."
              />
            </SectionCard>
          </div>
        </div>
      </section>
    </main>
  )
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="print-avoid-break rounded-[22px] border border-slate-200 p-5">
      <div className="mb-4 border-b border-slate-200 pb-3">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function DataTable({
  headers,
  rows,
  emptyText = 'Sin registros disponibles.',
}: {
  headers: string[]
  rows: string[][]
  emptyText?: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="print-table min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-bold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`} className="border-t border-slate-100">
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className={`px-4 py-3 ${cellIndex === 0 ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length} className="px-4 py-5 text-sm text-slate-500">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
