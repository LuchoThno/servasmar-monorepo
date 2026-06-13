'use client'

import { CheckCircle2, Filter, Menu, Plus, Search, X } from 'lucide-react'
import Link from 'next/link'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  return (
    <main className="min-h-screen bg-[var(--color-background-tertiary)] text-slate-950 md:grid md:grid-cols-[220px_1fr]">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-md bg-white shadow md:hidden"
        aria-label="Abrir navegación"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] transition md:sticky md:top-0 md:z-auto md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-[var(--color-border-tertiary)] px-4 py-4">
          <Link href="/admin/crm" className="flex items-center gap-2">
            <img src="/images/logo2.png" alt="SERVASMAR" className="h-9 w-9 rounded-md bg-white object-contain" />
            <div>
              <p className="text-sm font-black">SERVASMAR</p>
              <p className="text-[10px] font-bold uppercase text-slate-400">Proyectos</p>
            </div>
          </Link>
          <button type="button" onClick={() => setSidebarOpen(false)} className="md:hidden" aria-label="Cerrar navegación">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3">
          <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tarea" className="min-w-0 flex-1 bg-transparent outline-none" />
          </label>
        </div>

        <nav className="grid gap-1 px-3">
          <button
            type="button"
            onClick={() => {
              setProject('all')
              setSidebarOpen(false)
            }}
            className={`rounded-md border-l-[2.5px] px-3 py-2 text-left text-sm font-bold ${currentProject === 'all' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-transparent text-slate-600 hover:bg-white'}`}
          >
            Todos los proyectos
          </button>
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => {
                setProject(project.id)
                setSidebarOpen(false)
              }}
              className={`rounded-md border-l-[2.5px] px-3 py-2 text-left text-sm font-bold ${currentProject === project.id ? 'bg-white text-slate-950' : 'border-transparent text-slate-600 hover:bg-white'}`}
              style={{ borderLeftColor: currentProject === project.id ? project.color : 'transparent' }}
            >
              {project.name}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-3">
          <div className="rounded-[10px] border border-slate-200 bg-white p-3">
            <p className="text-xs font-bold uppercase text-slate-400">Usuario</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-xs font-black text-white">AD</span>
              <div>
                <p className="text-sm font-black">Administrador</p>
                <p className="text-xs text-slate-500">Gestión interna</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[var(--color-border-tertiary)] bg-white/95 px-4 py-4 backdrop-blur md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pl-12 md:pl-0">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Módulo de proyectos</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">{title}</h1>
            </div>
            <button type="button" onClick={() => openTaskModal()} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" />
              Nueva tarea
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 pl-12 md:pl-0">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-slate-400">
              <Filter className="h-3.5 w-3.5" />
              Vista
            </span>
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${currentFilter === item.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {item.label}
              </button>
            ))}
            <select value={currentProject} onChange={(event) => setProject(event.target.value)} className="ml-auto h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              <option value="all">Todos</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
        </header>

        <div className="grid gap-5 p-4 md:p-6">
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
    </main>
  )
}
