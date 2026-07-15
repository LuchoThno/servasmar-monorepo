'use client'

import { CheckCircle2, CircleDashed, Filter, FolderKanban, ListChecks, Plus, Printer, Search, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { TaskList } from '@/components/ui/TaskList'
import { crmTaskFromTask, useProjectStore } from '@/store/projectStore'
import { useApiClient } from '@/lib/useApiClient'
import type { CrmProjectRecord, FilterType, NewTaskInput, Task, TaskPriority } from '@/types/project.types'

const DetailPanel = lazy(() => import('@/components/ui/DetailPanel'))

const filters: Array<{ id: FilterType; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'inprogress', label: 'En progreso' },
  { id: 'done', label: 'Completadas' },
]

const priorityOptions: Array<{ id: TaskPriority; label: string }> = [
  { id: 'high', label: 'Alta' },
  { id: 'medium', label: 'Media' },
  { id: 'low', label: 'Baja' },
]

const emptyTaskForm: NewTaskInput = {
  name: '',
  proj: '',
  priority: 'medium',
  date: new Date().toISOString().slice(0, 10),
  assignees: ['AD'],
  tag: 'General',
}

export function ProjectModule() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isLoaded, isSignedIn, requestJson } = useApiClient()
  const projects = useProjectStore((state) => state.projects)
  const tasks = useProjectStore((state) => state.tasks)
  const crmProjects = useProjectStore((state) => state.crmProjects)
  const currentFilter = useProjectStore((state) => state.currentFilter)
  const currentProject = useProjectStore((state) => state.currentProject)
  const activeTask = useProjectStore((state) => state.activeTask)
  const hydrateFromCrm = useProjectStore((state) => state.hydrateFromCrm)
  const addTask = useProjectStore((state) => state.addTask)
  const deleteTask = useProjectStore((state) => state.deleteTask)
  const toggleTask = useProjectStore((state) => state.toggleTask)
  const setFilter = useProjectStore((state) => state.setFilter)
  const setProject = useProjectStore((state) => state.setProject)
  const openDetail = useProjectStore((state) => state.openDetail)
  const closeDetail = useProjectStore((state) => state.closeDetail)
  const [search, setSearch] = useState('')
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskForm, setTaskForm] = useState<NewTaskInput>(emptyTaskForm)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  const loadProjects = async () => {
    if (!isSignedIn) return
    const data = await requestJson<{ projects: CrmProjectRecord[] }>('/api/crm/admin/projects')
    if (data?.projects) hydrateFromCrm(data.projects)
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    loadProjects()
      .catch((error) => setToast(error instanceof Error ? error.message : 'No pudimos cargar proyectos'))
      .finally(() => setLoading(false))
  }, [hydrateFromCrm, isLoaded, isSignedIn, requestJson])

  useEffect(() => {
    const filter = searchParams.get('filter') as FilterType | null
    const project = searchParams.get('proj')
    if (filter && filters.some((item) => item.id === filter)) setFilter(filter)
    if (project && (project === 'all' || projects.some((item) => item.id === project))) setProject(project)
  }, [projects, searchParams, setFilter, setProject])

  useEffect(() => {
    const params = new URLSearchParams()
    if (currentProject !== 'all') params.set('proj', currentProject)
    if (currentFilter !== 'all') params.set('filter', currentFilter)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [currentFilter, currentProject, pathname, router])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesProject = currentProject === 'all' || task.proj === currentProject
      const matchesFilter = currentFilter === 'all' || task.status === currentFilter
      const matchesSearch = !search || task.name.toLowerCase().includes(search.toLowerCase()) || task.tag.toLowerCase().includes(search.toLowerCase())
      return matchesProject && matchesFilter && matchesSearch
    })
  }, [currentFilter, currentProject, search, tasks])

  const activeProject = projects.find((project) => project.id === currentProject)
  const title = activeProject ? activeProject.name : 'Todos los proyectos'
  const visibleProjects = activeProject ? [activeProject] : projects
  const openTasks = filteredTasks.filter((task) => task.status !== 'done').length
  const doneTasks = filteredTasks.filter((task) => task.status === 'done').length

  const persistProjectTasks = async (projectId: string, nextTasks: Task[] = useProjectStore.getState().tasks) => {
    const crmProject = crmProjects.find((project) => project._id === projectId)
    if (!crmProject) {
      setToast('Proyecto no sincronizado con MongoDB')
      return
    }

    const payload = {
      clientId: typeof crmProject.clientId === 'string' ? crmProject.clientId : crmProject.clientId._id,
      name: crmProject.name,
      serviceType: crmProject.serviceType || '',
      status: crmProject.status,
      startDate: crmProject.startDate?.slice(0, 10) || '',
      endDate: crmProject.endDate?.slice(0, 10) || '',
      description: crmProject.description || '',
      values: (crmProject.values || []).map((value) => ({
        ...value,
        dueDate: value.dueDate?.slice(0, 10) || '',
        notes: value.notes || '',
      })),
      tasks: nextTasks
        .filter((task) => task.proj === projectId)
        .map(crmTaskFromTask),
    }

    const data = await requestJson<{ project: CrmProjectRecord }>(`/api/crm/admin/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    if (data?.project) {
      const nextProjects = crmProjects.map((project) => project._id === data.project._id ? data.project : project)
      hydrateFromCrm(nextProjects)
    }
  }

  const openTaskModal = (projectId?: string) => {
    setTaskForm({
      ...emptyTaskForm,
      proj: projectId || (currentProject === 'all' ? projects[0]?.id || '' : currentProject),
      date: new Date().toISOString().slice(0, 10),
    })
    setIsTaskModalOpen(true)
  }

  const saveTask = () => {
    if (!taskForm.name.trim() || !taskForm.proj) return
    const task = addTask({ ...taskForm, name: taskForm.name.trim() })
    persistProjectTasks(task.proj)
      .then(() => setToast('Tarea creada y guardada en MongoDB'))
      .catch((error) => setToast(error instanceof Error ? error.message : 'No pudimos guardar en MongoDB'))
    setIsTaskModalOpen(false)
  }

  const removeTask = (id: string) => {
    const task = tasks.find((item) => item.id === id)
    deleteTask(id)
    if (task) {
      persistProjectTasks(task.proj)
        .then(() => setToast('Tarea eliminada'))
        .catch((error) => setToast(error instanceof Error ? error.message : 'No pudimos eliminar en MongoDB'))
    }
  }

  const saveDetail = async (task: Task, previousProjectId: string, message: string) => {
    await persistProjectTasks(task.proj)
    if (previousProjectId !== task.proj) {
      await persistProjectTasks(previousProjectId)
    }
    setToast(message)
  }

  const openProjectsPdf = () => window.open('/admin/proyectos/pdf', '_blank', 'noopener,noreferrer')

  return (
    <>
      <section className="grid gap-6 text-slate-950">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-5 text-white md:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Centro operativo</p>
                <h2 className="mt-1 text-2xl font-black">{title}</h2>
                <p className="mt-2 max-w-2xl text-sm font-medium text-slate-300">
                  Prioriza tareas, revisa avances y mantén la cartera de proyectos sincronizada con MongoDB.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={openProjectsPdf} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur hover:bg-white/15">
                  <Printer className="h-4 w-4" />
                  Abrir PDF proyectos
                </button>
                <button type="button" onClick={() => openTaskModal()} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500">
                  <Plus className="h-4 w-4" />
                  Nueva tarea
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ProjectKpi icon={FolderKanban} label="Proyectos visibles" value={visibleProjects.length} />
              <ProjectKpi icon={CircleDashed} label="Tareas abiertas" value={openTasks} />
              <ProjectKpi icon={ListChecks} label="Completadas" value={doneTasks} />
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(240px,360px)_1fr]">
            <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm">
              <Search className="h-4 w-4" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tarea o etiqueta" className="min-w-0 flex-1 bg-transparent outline-none" />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-slate-400">
                <Filter className="h-3.5 w-3.5" />
                Vista
              </span>
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${currentFilter === item.id ? 'bg-blue-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`}
                >
                  {item.label}
                </button>
              ))}
              <select value={currentProject} onChange={(event) => setProject(event.target.value)} className="ml-auto h-10 min-w-[190px] rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
                <option value="all">Todos los proyectos</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white p-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <ProjectPill active={currentProject === 'all'} label="Todos" onClick={() => setProject('all')} />
              {projects.map((project) => (
                <ProjectPill
                  key={project.id}
                  active={currentProject === project.id}
                  label={project.name}
                  color={project.color}
                  onClick={() => setProject(project.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          {loading && (
            <div className="rounded-[10px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
              Sincronizando proyectos desde MongoDB...
            </div>
          )}

          {!loading && !projects.length && (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm font-bold text-amber-800">
              No hay proyectos en MongoDB. Crea proyectos desde CRM para empezar.
            </div>
          )}

          {activeProject ? (
            <ProjectCard project={activeProject} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
            </div>
          )}

          <TaskList
            tasks={filteredTasks}
            projects={projects}
            projectId={currentProject}
            onAddTask={openTaskModal}
            onOpenTask={openDetail}
            onDeleteTask={removeTask}
            onToggleTask={(id) => {
              const task = tasks.find((item) => item.id === id)
              toggleTask(id)
              if (task) {
                persistProjectTasks(task.proj)
                  .then(() => setToast('Estado actualizado'))
                  .catch((error) => setToast(error instanceof Error ? error.message : 'No pudimos guardar el estado'))
              }
            }}
          />
        </div>
      </section>

      {activeTask && (
        <Suspense fallback={null}>
          <DetailPanel task={activeTask} onClose={closeDetail} onToast={setToast} onSave={saveDetail} />
        </Suspense>
      )}

      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
          <aside className="w-full max-w-lg rounded-[10px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-black text-slate-950">Nueva tarea</h2>
              <button type="button" onClick={() => setIsTaskModalOpen(false)} className="text-slate-500" aria-label="Cerrar modal">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 p-5 text-sm">
              <input value={taskForm.name} onChange={(event) => setTaskForm({ ...taskForm, name: event.target.value })} placeholder="Nombre de la tarea" className="h-11 rounded-md border border-slate-200 px-3" />
              <select value={taskForm.proj} onChange={(event) => setTaskForm({ ...taskForm, proj: event.target.value })} className="h-11 rounded-md border border-slate-200 px-3">
                <option value="">Selecciona proyecto</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value as TaskPriority })} className="h-11 rounded-md border border-slate-200 px-3">
                  {priorityOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <input type="date" value={taskForm.date} onChange={(event) => setTaskForm({ ...taskForm, date: event.target.value })} className="h-11 rounded-md border border-slate-200 px-3" />
              </div>
              <input value={taskForm.assignees.join(', ')} onChange={(event) => setTaskForm({ ...taskForm, assignees: event.target.value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean) })} placeholder="Asignados, separados por coma" className="h-11 rounded-md border border-slate-200 px-3" />
              <input value={taskForm.tag} onChange={(event) => setTaskForm({ ...taskForm, tag: event.target.value })} placeholder="Etiqueta" className="h-11 rounded-md border border-slate-200 px-3" />
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => setIsTaskModalOpen(false)} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={saveTask} disabled={!taskForm.name.trim() || !taskForm.proj} className="h-10 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">Guardar</button>
            </footer>
          </aside>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-[10px] border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          {toast}
        </div>
      )}
    </>
  )
}

function ProjectKpi({ icon: Icon, label, value }: { icon: typeof FolderKanban; label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/10 p-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-blue-100">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function ProjectPill({ active, label, color, onClick }: { active: boolean; label: string; color?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition ${active ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color || (active ? '#60a5fa' : '#94a3b8') }} />
      {label}
    </button>
  )
}
