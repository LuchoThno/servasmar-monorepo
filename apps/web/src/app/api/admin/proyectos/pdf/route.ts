import { NextRequest } from 'next/server'
import { requirePermission } from '@/app/api/_lib/auth'
import { toErrorResponse } from '@/app/api/_lib/apiError'
import { createAdminPdfDocument, drawReportHeader, drawSectionTitle, drawTable, pdfToBuffer } from '@/lib/server/adminPdf'
import { loadProjectsPdfData } from '@/lib/server/adminPdfData'
import { registerPdfExport } from '@/lib/server/adminPdfLog'

export const runtime = 'nodejs'

const money = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount || 0)
const dateValue = (value?: string) => (value ? new Intl.DateTimeFormat('es-CL').format(new Date(value)) : '-')

const statusLabel: Record<string, string> = {
  prospecto: 'Prospecto',
  en_progreso: 'En progreso',
  pausado: 'Pausado',
  cerrado: 'Cerrado',
  perdido: 'Perdido',
}

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'projects', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const { projects } = await loadProjectsPdfData()
    const today = new Date().toISOString().slice(0, 10)
    const tasks = projects.flatMap((project: any) => project.tasks.map((task: any) => ({ ...task, project })))
    const openTasks = tasks.filter((task: any) => task.status !== 'completada').length
    const completedTasks = tasks.filter((task: any) => task.status === 'completada').length
    const overdueTasks = tasks.filter((task: any) => task.status !== 'completada' && task.dueDate && task.dueDate.slice(0, 10) < today).length
    const activeProjects = projects.filter((project: any) => ['prospecto', 'en_progreso', 'pausado'].includes(project.status)).length
    const exportLog = await registerPdfExport('proyectos', authorized, {
      rows: { projects: projects.length, tasks: tasks.length, overdueTasks },
    })

    const projectRows = projects.map((project: any) => {
      const totalTasks = project.tasks.length
      const completed = project.tasks.filter((task: any) => task.status === 'completada').length
      const overdue = project.tasks.filter((task: any) => task.status !== 'completada' && task.dueDate && task.dueDate.slice(0, 10) < today).length
      const totalIncome = project.values.filter((value: any) => value.type === 'ingreso').reduce((total: number, value: any) => total + Number(value.amount || 0), 0)
      const totalExpense = project.values.filter((value: any) => value.type === 'egreso').reduce((total: number, value: any) => total + Number(value.amount || 0), 0)
      const progress = totalTasks ? Math.round(completed / totalTasks * 100) : 0
      return { project, totalTasks, completed, overdue, totalIncome, totalExpense, progress }
    })

    const doc = createAdminPdfDocument('SERVASMAR - Proyectos')
    drawReportHeader(doc, {
      title: 'Proyectos',
      subtitle: 'Estado ejecutivo del portafolio, avance operativo y carga de tareas.',
      sequenceLabel: exportLog.sequenceLabel,
      exportId: exportLog.exportId,
    })

    drawSectionTitle(doc, 'Resumen operativo', 'Lectura ejecutiva del portafolio y sus tareas activas.')
    drawTable(
      doc,
      [
        { key: 'metric', label: 'Indicador', width: 220 },
        { key: 'value', label: 'Valor', width: 295, align: 'right' },
      ],
      [
        { metric: 'Proyectos totales', value: String(projects.length) },
        { metric: 'Proyectos activos', value: String(activeProjects) },
        { metric: 'Tareas abiertas', value: String(openTasks) },
        { metric: 'Tareas completadas', value: String(completedTasks) },
        { metric: 'Tareas vencidas', value: String(overdueTasks) },
      ]
    )

    drawSectionTitle(doc, 'Semaforos ejecutivos', 'Nivel de avance y riesgo operativo del modulo.')
    drawTable(
      doc,
      [
        { key: 'factor', label: 'Factor', width: 140 },
        { key: 'status', label: 'Estado', width: 375 },
      ],
      [
        {
          factor: 'Avance',
          status:
            completedTasks >= openTasks
              ? `Verde | ${completedTasks} tarea(s) completadas frente a ${openTasks} abiertas`
              : `Amarillo | ${openTasks} tarea(s) activas en ejecucion`,
        },
        {
          factor: 'Riesgo',
          status:
            overdueTasks > 5
              ? `Rojo | ${overdueTasks} tarea(s) vencidas en el portafolio`
              : overdueTasks > 0
                ? `Amarillo | ${overdueTasks} tarea(s) vencidas por resolver`
                : 'Verde | Sin tareas vencidas',
        },
      ]
    )

    drawSectionTitle(doc, 'Portafolio de proyectos', 'Estado, avance, tareas y valores asociados por proyecto.')
    drawTable(
      doc,
      [
        { key: 'project', label: 'Proyecto', width: 160 },
        { key: 'status', label: 'Estado', width: 90 },
        { key: 'tasks', label: 'Tareas', width: 65, align: 'right' },
        { key: 'progress', label: 'Avance', width: 60, align: 'right' },
        { key: 'overdue', label: 'Vencidas', width: 65, align: 'right' },
        { key: 'values', label: 'Valores', width: 75, align: 'right' },
      ],
      projectRows.map((row) => ({
        project: row.project.name,
        status: statusLabel[row.project.status] || row.project.status,
        tasks: `${row.completed}/${row.totalTasks}`,
        progress: `${row.progress}%`,
        overdue: String(row.overdue),
        values: money(row.totalIncome - row.totalExpense),
      }))
    )

    drawSectionTitle(doc, 'Proximas tareas', 'Actividades abiertas mas cercanas para seguimiento.')
    drawTable(
      doc,
      [
        { key: 'task', label: 'Tarea', width: 190 },
        { key: 'project', label: 'Proyecto', width: 150 },
        { key: 'dueDate', label: 'Vence', width: 70, align: 'center' },
        { key: 'priority', label: 'Prioridad', width: 105 },
      ],
      tasks
        .filter((task: any) => task.status !== 'completada' && task.dueDate)
        .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 12)
        .map((task: any) => ({
          task: task.title,
          project: task.project.name,
          dueDate: dateValue(task.dueDate),
          priority: task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baja' : 'Media',
        }))
    )

    drawSectionTitle(doc, 'Detalle economico por proyecto', 'Valores de ingreso y egreso declarados en CRM.')
    drawTable(
      doc,
      [
        { key: 'project', label: 'Proyecto', width: 225 },
        { key: 'income', label: 'Ingreso', width: 95, align: 'right' },
        { key: 'expense', label: 'Egreso', width: 95, align: 'right' },
        { key: 'updated', label: 'Actualizado', width: 100, align: 'center' },
      ],
      projectRows.map((row) => ({
        project: row.project.name,
        income: money(row.totalIncome),
        expense: money(row.totalExpense),
        updated: dateValue(row.project.updatedAt),
      }))
    )

    const buffer = await pdfToBuffer(doc, {
      downloadedBy: authorized.email,
      generatedAt: exportLog.generatedAt,
      documentType: 'Proyectos',
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
