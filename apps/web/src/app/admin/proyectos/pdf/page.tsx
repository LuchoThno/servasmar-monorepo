'use client'

import { Printer } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useApiClient } from '@/lib/useApiClient'
import type { CrmProjectRecord, CrmProjectTask } from '@/types/project.types'

const company = {
  name: 'SERVASMAR',
  legal: 'Consultoría marítima, portuaria y costera',
  email: 'contacto@servasmar.cl',
  website: 'www.servasmar.cl',
  location: 'Chile',
}

const statusLabel: Record<string, string> = {
  prospecto: 'Prospecto',
  en_progreso: 'En progreso',
  pausado: 'Pausado',
  cerrado: 'Cerrado',
  perdido: 'Perdido',
}

const money = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount || 0)
const dateValue = (value?: string) => (value ? new Intl.DateTimeFormat('es-CL').format(new Date(value)) : '-')
const generatedAt = () => new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())

export default function ProjectsPdfPage() {
  const { authHeaders, isLoaded, isSignedIn } = useApiClient()
  const [projects, setProjects] = useState<CrmProjectRecord[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const load = async () => {
      try {
        const response = await fetch('/api/crm/admin/projects', { headers: await authHeaders() })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error?.message || 'No pudimos cargar los proyectos')
        setProjects(data.projects || [])
      } catch (currentError) {
        setError(currentError instanceof Error ? currentError.message : 'No pudimos cargar el reporte de proyectos')
      }
    }

    load()
  }, [authHeaders, isLoaded, isSignedIn])

  const today = new Date().toISOString().slice(0, 10)

  const summary = useMemo(() => {
    const tasks = projects.flatMap((project) => project.tasks.map((task) => ({ ...task, project })))
    const openTasks = tasks.filter((task) => task.status !== 'completada').length
    const completedTasks = tasks.filter((task) => task.status === 'completada').length
    const overdueTasks = tasks.filter((task) => task.status !== 'completada' && task.dueDate && task.dueDate.slice(0, 10) < today).length
    const activeProjects = projects.filter((project) => ['prospecto', 'en_progreso', 'pausado'].includes(project.status)).length
    return { tasks, openTasks, completedTasks, overdueTasks, activeProjects }
  }, [projects, today])

  const topProjects = useMemo(
    () =>
      projects.map((project) => {
        const totalTasks = project.tasks.length
        const completed = project.tasks.filter((task) => task.status === 'completada').length
        const overdue = project.tasks.filter((task) => task.status !== 'completada' && task.dueDate && task.dueDate.slice(0, 10) < today).length
        const totalIncome = project.values.filter((value) => value.type === 'ingreso').reduce((total, value) => total + Number(value.amount || 0), 0)
        const totalExpense = project.values.filter((value) => value.type === 'egreso').reduce((total, value) => total + Number(value.amount || 0), 0)
        const progress = totalTasks ? Math.round(completed / totalTasks * 100) : 0
        return { ...project, totalTasks, completed, overdue, totalIncome, totalExpense, progress }
      }).sort((a, b) => b.totalTasks - a.totalTasks || b.updatedAt?.localeCompare(a.updatedAt || '') || 0),
    [projects, today]
  )

  const upcomingTasks = useMemo(
    () =>
      summary.tasks
        .filter((task) => task.status !== 'completada' && task.dueDate)
        .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
        .slice(0, 10),
    [summary.tasks]
  )

  if (error) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-red-700">{error}</main>
  }

  if (!isLoaded || !isSignedIn) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-700">Cargando reporte de proyectos...</main>
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
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">PDF proyectos</p>
                <h1 className="mt-2 text-[28px] font-black tracking-tight text-slate-950">Modulo Proyectos</h1>
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
          <SectionCard title="Resumen operativo" subtitle="Vista ejecutiva del portafolio de proyectos y el estado de sus tareas.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Proyectos totales" value={String(projects.length)} />
              <MetricCard label="Proyectos activos" value={String(summary.activeProjects)} />
              <MetricCard label="Tareas abiertas" value={String(summary.openTasks)} />
              <MetricCard label="Tareas vencidas" value={String(summary.overdueTasks)} />
            </div>
          </SectionCard>

          <SectionCard title="Semaforo de ejecucion" subtitle="Lectura rapida del estado operativo del modulo.">
            <div className="grid gap-4 lg:grid-cols-2">
              <SignalCard
                title="Avance"
                signal={
                  summary.completedTasks >= summary.openTasks
                    ? { label: 'Avance controlado', detail: `${summary.completedTasks} tarea(s) completadas frente a ${summary.openTasks} abiertas.`, tone: 'emerald' }
                    : summary.overdueTasks > 0
                      ? { label: 'Avance con friccion', detail: `${summary.overdueTasks} tarea(s) vencidas requieren replanificacion.`, tone: 'amber' }
                      : { label: 'Avance en desarrollo', detail: `${summary.openTasks} tarea(s) activas en ejecucion.`, tone: 'emerald' }
                }
              />
              <SignalCard
                title="Riesgo"
                signal={
                  summary.overdueTasks > 5
                    ? { label: 'Riesgo operativo alto', detail: `Existen ${summary.overdueTasks} tareas vencidas en el portafolio.`, tone: 'rose' }
                    : summary.overdueTasks > 0
                      ? { label: 'Riesgo operativo moderado', detail: `Existen ${summary.overdueTasks} tareas vencidas por resolver.`, tone: 'amber' }
                      : { label: 'Riesgo contenido', detail: 'No se observan tareas vencidas en el portafolio actual.', tone: 'emerald' }
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Portafolio de proyectos" subtitle="Estado, carga operativa, avance y valores asociados por proyecto.">
            <DataTable
              headers={['Proyecto', 'Estado', 'Tareas', 'Avance', 'Vencidas', 'Valores']}
              rows={topProjects.slice(0, 10).map((project) => [
                project.name,
                statusLabel[project.status] || project.status,
                `${project.completed}/${project.totalTasks}`,
                `${project.progress}%`,
                String(project.overdue),
                `${money(project.totalIncome)} / ${money(project.totalExpense)}`,
              ])}
              emptyText="Sin proyectos registrados."
            />
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Proximas tareas" subtitle="Actividades abiertas mas cercanas para seguimiento de ejecucion.">
              <DataTable
                headers={['Tarea', 'Proyecto', 'Vence', 'Prioridad']}
                rows={upcomingTasks.map((task) => [
                  task.title,
                  task.project.name,
                  dateValue(task.dueDate),
                  priorityLabel(task),
                ])}
                emptyText="Sin tareas abiertas con fecha comprometida."
              />
            </SectionCard>

            <SectionCard title="Detalle economico por proyecto" subtitle="Ingreso y egreso declarado desde el CRM de proyectos.">
              <DataTable
                headers={['Proyecto', 'Ingreso', 'Egreso', 'Estado']}
                rows={topProjects.slice(0, 10).map((project) => [
                  project.name,
                  money(project.totalIncome),
                  money(project.totalExpense),
                  statusLabel[project.status] || project.status,
                ])}
                emptyText="Sin valores economicos cargados en proyectos."
              />
            </SectionCard>
          </div>
        </div>
      </section>
    </main>
  )
}

function priorityLabel(task: CrmProjectTask) {
  if (task.priority === 'high') return 'Alta'
  if (task.priority === 'low') return 'Baja'
  return 'Media'
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
  signal: { label: string; detail: string; tone: 'emerald' | 'amber' | 'rose' }
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
