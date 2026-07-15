'use client'

import { Printer } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useApiClient } from '@/lib/useApiClient'

type Summary = {
  activeClients: number
  activeProjects: number
  invoicesPendingAmount: number
  overdueInvoicesAmount: number
  pendingInstallments: number
  overdueInstallments: number
  monthlyIssued: number
  monthlyCollectedEstimate: number
  monthlyIncome: number
  monthlyExpense: number
  monthlyUtility: number
  portfolioByStatus: Array<{ _id: string; total: number }>
  expenseByCategory: Array<{ _id: string; total: number }>
  projectProfitability: Array<{
    _id: string
    name: string
    code?: string
    totalIncome: number
    totalExpenses: number
    utility: number
    margin: number
  }>
}

type CollectionsSummary = {
  alertSummary: {
    overdueInvoices: number
    overdueInstallments: number
    severeInvoices: number
    pendingActions: number
  }
  overdueInvoices: Array<{
    _id: string
    invoiceNumber: string
    dueDate: string
    totalAmount: number
    daysOverdue: number
    clientId?: { name: string }
    projectId?: { name: string; code?: string }
  }>
  overdueInstallments: Array<{
    _id: string
    installmentNumber: number
    amount: number
    dueDate: string
    clientId?: { name: string }
    projectId?: { name: string; code?: string }
    invoiceId?: { invoiceNumber: string }
  }>
  pendingActions: Array<{
    _id: string
    action: string
    createdAt: string
    clientId?: { name: string }
    projectId?: { name: string; code?: string }
  }>
}

const company = {
  name: 'SERVASMAR',
  legal: 'Consultoría marítima, portuaria y costera',
  email: 'contacto@servasmar.cl',
  website: 'www.servasmar.cl',
  location: 'Chile',
}

const emptySummary: Summary = {
  activeClients: 0,
  activeProjects: 0,
  invoicesPendingAmount: 0,
  overdueInvoicesAmount: 0,
  pendingInstallments: 0,
  overdueInstallments: 0,
  monthlyIssued: 0,
  monthlyCollectedEstimate: 0,
  monthlyIncome: 0,
  monthlyExpense: 0,
  monthlyUtility: 0,
  portfolioByStatus: [],
  expenseByCategory: [],
  projectProfitability: [],
}

const emptyCollections: CollectionsSummary = {
  alertSummary: {
    overdueInvoices: 0,
    overdueInstallments: 0,
    severeInvoices: 0,
    pendingActions: 0,
  },
  overdueInvoices: [],
  overdueInstallments: [],
  pendingActions: [],
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
type SignalTone = 'emerald' | 'amber' | 'rose'
type SignalValue = { label: string; detail: string; tone: SignalTone }

export default function FinancePdfPage() {
  const { authHeaders, isLoaded, isSignedIn } = useApiClient()
  const [summary, setSummary] = useState<Summary>(emptySummary)
  const [collections, setCollections] = useState<CollectionsSummary>(emptyCollections)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const load = async () => {
      try {
        const headers = await authHeaders()
        const [summaryResponse, collectionsResponse] = await Promise.all([
          fetch('/api/finance/admin/summary', { headers }),
          fetch('/api/finance/admin/collections/summary', { headers }),
        ])
        const [summaryData, collectionsData] = await Promise.all([summaryResponse.json(), collectionsResponse.json()])
        if (!summaryResponse.ok) throw new Error(summaryData?.error?.message || 'No pudimos cargar el resumen financiero')
        if (!collectionsResponse.ok) throw new Error(collectionsData?.error?.message || 'No pudimos cargar la cobranza')
        setSummary(summaryData.summary || emptySummary)
        setCollections({
          alertSummary: collectionsData.alertSummary || emptyCollections.alertSummary,
          overdueInvoices: collectionsData.overdueInvoices || [],
          overdueInstallments: collectionsData.overdueInstallments || [],
          pendingActions: collectionsData.pendingActions || [],
        })
      } catch (currentError) {
        setError(currentError instanceof Error ? currentError.message : 'No pudimos cargar el reporte financiero')
      }
    }

    load()
  }, [authHeaders, isLoaded, isSignedIn])

  const utilitySignal = useMemo<SignalValue>(() => {
    if (summary.monthlyUtility > 0) return { label: 'Salud operativa favorable', tone: 'emerald', detail: `Utilidad mensual ${money(summary.monthlyUtility)}` }
    if (summary.monthlyUtility === 0) return { label: 'Utilidad en equilibrio', tone: 'amber', detail: 'El periodo se mantiene sin variacion neta relevante.' }
    return { label: 'Utilidad bajo presion', tone: 'rose', detail: `Resultado mensual ${money(summary.monthlyUtility)}` }
  }, [summary.monthlyUtility])

  const delinquencySignal = useMemo<SignalValue>(() => {
    if (collections.alertSummary.severeInvoices > 0) return { label: 'Mora critica', tone: 'rose', detail: `${collections.alertSummary.severeInvoices} factura(s) con mora severa.` }
    if (collections.alertSummary.overdueInvoices > 0 || collections.alertSummary.overdueInstallments > 0) {
      return { label: 'Mora activa', tone: 'amber', detail: `${collections.alertSummary.overdueInvoices} factura(s) y ${collections.alertSummary.overdueInstallments} cuota(s) vencidas.` }
    }
    return { label: 'Mora controlada', tone: 'emerald', detail: 'Sin documentos vencidos al cierre del reporte.' }
  }, [collections.alertSummary])

  if (error) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-red-700">{error}</main>
  }

  if (!isLoaded || !isSignedIn) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-700">Cargando reporte financiero...</main>
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
        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">
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
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">PDF finanzas</p>
                <h1 className="mt-2 text-[28px] font-black tracking-tight text-slate-950">Modulo Finanzas</h1>
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
          <SectionCard title="Semaforos ejecutivos" subtitle="Lectura inmediata del estado financiero y de la mora activa.">
            <div className="grid gap-4 lg:grid-cols-2">
              <SignalCard title="Utilidad" signal={utilitySignal} />
              <SignalCard title="Mora" signal={delinquencySignal} />
            </div>
          </SectionCard>

          <SectionCard title="Indicadores financieros" subtitle="Variables clave del modulo para seguimiento de caja, cartera y operacion.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Por cobrar" value={money(summary.invoicesPendingAmount)} />
              <MetricCard label="Vencido" value={money(summary.overdueInvoicesAmount)} />
              <MetricCard label="Ingreso mensual" value={money(summary.monthlyIncome)} />
              <MetricCard label="Egreso mensual" value={money(summary.monthlyExpense)} />
              <MetricCard label="Facturado mes" value={money(summary.monthlyIssued)} />
              <MetricCard label="Cobrado estimado" value={money(summary.monthlyCollectedEstimate)} />
              <MetricCard label="Cuotas pendientes" value={String(summary.pendingInstallments)} />
              <MetricCard label="Cuotas vencidas" value={String(summary.overdueInstallments)} />
            </div>
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Cartera por estado" subtitle="Distribucion de montos segun estado de la cartera registrada.">
              <DataTable
                headers={['Estado', 'Monto']}
                rows={summary.portfolioByStatus.map((row) => [row._id, money(row.total)])}
                emptyText="Sin cartera disponible."
              />
            </SectionCard>

            <SectionCard title="Egresos por categoria" subtitle="Principales rubros de costo registrados.">
              <DataTable
                headers={['Categoria', 'Monto']}
                rows={summary.expenseByCategory.slice(0, 8).map((row) => [expenseCategoryLabels[row._id] || row._id, money(row.total)])}
                emptyText="Sin egresos registrados."
              />
            </SectionCard>
          </div>

          <SectionCard title="Rentabilidad por proyecto" subtitle="Proyectos con mayor impacto financiero dentro del modulo.">
            <DataTable
              headers={['Proyecto', 'Ingresos', 'Egresos', 'Utilidad', 'Margen']}
              rows={summary.projectProfitability.slice(0, 8).map((project) => [
                `${project.code ? `${project.code} · ` : ''}${project.name}`,
                money(project.totalIncome),
                money(project.totalExpenses),
                money(project.utility),
                percent(project.margin),
              ])}
              emptyText="Sin rentabilidad consolidada por proyecto."
            />
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Facturas vencidas" subtitle="Documentos de cobro que requieren prioridad de gestion.">
              <DataTable
                headers={['Factura', 'Cliente', 'Vence', 'Mora', 'Monto']}
                rows={collections.overdueInvoices.slice(0, 8).map((invoice) => [
                  invoice.invoiceNumber,
                  invoice.clientId?.name || '-',
                  dateValue(invoice.dueDate),
                  `${invoice.daysOverdue} dias`,
                  money(invoice.totalAmount),
                ])}
                emptyText="No existen facturas vencidas."
              />
            </SectionCard>

            <SectionCard title="Cuotas vencidas y acciones" subtitle="Seguimiento operativo de cuotas atrasadas y tareas pendientes.">
              <DataTable
                headers={['Referencia', 'Cliente', 'Fecha', 'Monto']}
                rows={[
                  ...collections.overdueInstallments.slice(0, 4).map((item) => [
                    `Cuota ${item.installmentNumber}${item.invoiceId?.invoiceNumber ? ` · ${item.invoiceId.invoiceNumber}` : ''}`,
                    item.clientId?.name || '-',
                    dateValue(item.dueDate),
                    money(item.amount),
                  ]),
                  ...collections.pendingActions.slice(0, 4).map((item) => [
                    item.action,
                    item.clientId?.name || '-',
                    dateValue(item.createdAt),
                    item.projectId?.code ? `${item.projectId.code} · ${item.projectId.name}` : item.projectId?.name || '-',
                  ]),
                ]}
                emptyText="Sin cuotas vencidas ni acciones pendientes."
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </article>
  )
}

function SignalCard({
  title,
  signal,
}: {
  title: string
  signal: SignalValue
}) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
  }

  return (
    <article className={`rounded-2xl border px-4 py-4 ${tones[signal.tone]}`}>
      <div className="flex items-center gap-3">
        <span className={`h-3.5 w-3.5 rounded-full ${signal.tone === 'emerald' ? 'bg-emerald-500' : signal.tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'}`} />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{title}</p>
          <p className="mt-1 text-sm font-semibold">{signal.label}</p>
        </div>
      </div>
      <p className="mt-3 text-sm">{signal.detail}</p>
    </article>
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
