'use client'

import { create } from 'zustand'
import { seedProjects, seedTasks } from '@/data/seed'
import type { CrmProjectRecord, CrmProjectStatus, CrmProjectTask, CrmTaskStatus, FilterType, NewTaskInput, Project, ProjectStatus, Task, TaskStatus } from '@/types/project.types'

type ProjectStore = {
  projects: Project[]
  tasks: Task[]
  currentFilter: FilterType
  currentProject: string | 'all'
  activeTask: Task | null
  crmProjects: CrmProjectRecord[]
  hydrateFromCrm: (projects: CrmProjectRecord[]) => void
  addTask: (task: NewTaskInput) => Task
  updateTask: (id: string, partial: Partial<Task>, activity?: string) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  toggleSubtask: (taskId: string, subtaskIdx: number) => void
  addSubtask: (taskId: string, text: string) => void
  setFilter: (filter: FilterType) => void
  setProject: (id: string | 'all') => void
  openDetail: (task: Task) => void
  closeDetail: () => void
}

const projectColors = ['#2563EB', '#16A34A', '#7C3AED', '#BA7517', '#E24B4A', '#0891B2']
const projectIcons = ['anchor', 'leaf', 'clipboard']

const projectStatusMap: Record<CrmProjectStatus, ProjectStatus> = {
  prospecto: 'active',
  en_progreso: 'active',
  pausado: 'paused',
  cerrado: 'completed',
  perdido: 'risk',
}

const taskStatusToUi: Record<CrmTaskStatus, TaskStatus> = {
  pendiente: 'pending',
  en_progreso: 'inprogress',
  completada: 'done',
  bloqueada: 'pending',
}

export const taskStatusToCrm: Record<TaskStatus, CrmTaskStatus> = {
  pending: 'pendiente',
  inprogress: 'en_progreso',
  done: 'completada',
}

const normalizeDate = (value?: string) => (value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10))

const projectFromCrm = (project: CrmProjectRecord, index: number): Project => ({
  id: project._id,
  name: project.name,
  color: projectColors[index % projectColors.length],
  icon: projectIcons[index % projectIcons.length],
  status: projectStatusMap[project.status],
  pct: 0,
  total: 0,
  done: 0,
  overdue: 0,
  desc: project.description || project.serviceType || 'Proyecto CRM sin descripción.',
})

export const taskFromCrm = (project: CrmProjectRecord, task: CrmProjectTask, index: number): Task => ({
  id: task._id || `${project._id}-task-${index}`,
  proj: project._id,
  name: task.title,
  priority: task.priority || 'medium',
  status: taskStatusToUi[task.status] || 'pending',
  tag: task.tag || project.serviceType || 'General',
  tagColor: task.tagColor || 'blue',
  date: normalizeDate(task.dueDate),
  assignees: task.assignees?.length ? task.assignees : task.owner ? [task.owner] : ['AD'],
  desc: task.desc || task.notes || '',
  subtasks: task.subtasks || [],
  attachments: task.attachments || [],
  activity: task.activity?.length ? task.activity : ['Tarea sincronizada desde MongoDB'],
})

export const crmTaskFromTask = (task: Task): CrmProjectTask => ({
  _id: task.id.startsWith('task-') ? undefined : task.id,
  title: task.name,
  owner: task.assignees[0] || '',
  dueDate: task.date,
  status: taskStatusToCrm[task.status],
  notes: task.desc,
  priority: task.priority,
  tag: task.tag,
  tagColor: task.tagColor,
  assignees: task.assignees,
  desc: task.desc,
  subtasks: task.subtasks,
  attachments: task.attachments,
  activity: task.activity,
})

const recalcProjects = (projects: Project[], tasks: Task[]) =>
  projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.proj === project.id)
    const done = projectTasks.filter((task) => task.status === 'done').length
    const overdue = projectTasks.filter((task) => task.status !== 'done' && task.date < new Date().toISOString().slice(0, 10)).length
    return {
      ...project,
      total: projectTasks.length,
      done,
      overdue,
      pct: projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0,
    }
  })

const withUpdatedTask = (tasks: Task[], id: string, updater: (task: Task) => Task) =>
  tasks.map((task) => task.id === id ? updater(task) : task)

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: recalcProjects(seedProjects, seedTasks),
  tasks: seedTasks,
  currentFilter: 'all',
  currentProject: 'all',
  activeTask: null,
  crmProjects: [],

  hydrateFromCrm: (crmProjects) => {
    const projects = crmProjects.map(projectFromCrm)
    const tasks = crmProjects.flatMap((project) => project.tasks.map((task, index) => taskFromCrm(project, task, index)))
    set({
      crmProjects,
      projects: recalcProjects(projects, tasks),
      tasks,
      activeTask: null,
      currentProject: get().currentProject !== 'all' && !projects.some((project) => project.id === get().currentProject) ? 'all' : get().currentProject,
    })
  },

  addTask: (input) => {
    const task: Task = {
      id: `task-${Date.now()}`,
      proj: input.proj,
      name: input.name.trim(),
      priority: input.priority,
      status: 'pending',
      tag: input.tag || 'General',
      tagColor: 'blue',
      date: input.date,
      assignees: input.assignees.length ? input.assignees : ['AD'],
      desc: '',
      subtasks: [],
      attachments: [],
      activity: ['Tarea creada'],
    }
    const tasks = [task, ...get().tasks]
    set({ tasks, projects: recalcProjects(get().projects, tasks) })
    return task
  },

  updateTask: (id, partial, activity = 'Cambios guardados') => {
    const tasks = withUpdatedTask(get().tasks, id, (task) => ({
      ...task,
      ...partial,
      activity: [...task.activity, activity],
    }))
    set({
      tasks,
      projects: recalcProjects(get().projects, tasks),
      activeTask: get().activeTask?.id === id ? tasks.find((task) => task.id === id) || null : get().activeTask,
    })
  },

  deleteTask: (id) => {
    const tasks = get().tasks.filter((task) => task.id !== id)
    set({
      tasks,
      projects: recalcProjects(get().projects, tasks),
      activeTask: get().activeTask?.id === id ? null : get().activeTask,
    })
  },

  toggleTask: (id) => {
    const tasks = withUpdatedTask(get().tasks, id, (task) => {
      const nextStatus = task.status === 'done' ? 'inprogress' : 'done'
      return {
        ...task,
        status: nextStatus,
        activity: [...task.activity, nextStatus === 'done' ? 'Tarea marcada como completada' : 'Tarea reabierta'],
      }
    })
    set({
      tasks,
      projects: recalcProjects(get().projects, tasks),
      activeTask: get().activeTask?.id === id ? tasks.find((task) => task.id === id) || null : get().activeTask,
    })
  },

  toggleSubtask: (taskId, subtaskIdx) => {
    const tasks = withUpdatedTask(get().tasks, taskId, (task) => ({
      ...task,
      subtasks: task.subtasks.map((subtask, index) => index === subtaskIdx ? { ...subtask, done: !subtask.done } : subtask),
      activity: [...task.activity, 'Subtarea actualizada'],
    }))
    set({
      tasks,
      activeTask: get().activeTask?.id === taskId ? tasks.find((task) => task.id === taskId) || null : get().activeTask,
    })
  },

  addSubtask: (taskId, text) => {
    const cleanText = text.trim()
    if (!cleanText) return
    const tasks = withUpdatedTask(get().tasks, taskId, (task) => ({
      ...task,
      subtasks: [...task.subtasks, { text: cleanText, done: false }],
      activity: [...task.activity, `Subtarea agregada: ${cleanText}`],
    }))
    set({
      tasks,
      activeTask: get().activeTask?.id === taskId ? tasks.find((task) => task.id === taskId) || null : get().activeTask,
    })
  },

  setFilter: (currentFilter) => set({ currentFilter }),
  setProject: (currentProject) => set({ currentProject }),
  openDetail: (activeTask) => set({ activeTask }),
  closeDetail: () => set({ activeTask: null }),
}))
