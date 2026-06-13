'use client'

import { Anchor, ClipboardList, Leaf, Plus } from 'lucide-react'
import { TaskCard } from '@/components/ui/TaskCard'
import type { Project, Task } from '@/types/project.types'

const iconMap = {
  anchor: Anchor,
  leaf: Leaf,
  clipboard: ClipboardList,
}

type TaskListProps = {
  tasks: Task[]
  projects: Project[]
  projectId?: string | 'all'
  onAddTask: (projectId?: string) => void
  onOpenTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onToggleTask: (id: string) => void
}

export function TaskList({ tasks, projects, projectId = 'all', onAddTask, onOpenTask, onDeleteTask, onToggleTask }: TaskListProps) {
  const visibleProjects = projectId === 'all' ? projects : projects.filter((project) => project.id === projectId)

  return (
    <div className="grid gap-4">
      {visibleProjects.map((project) => {
        const Icon = iconMap[project.icon as keyof typeof iconMap] || ClipboardList
        const projectTasks = tasks.filter((task) => task.proj === project.id)

        return (
          <section key={project.id} className="rounded-[10px] border border-[var(--color-border-tertiary)] bg-white/70">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: project.color }}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">{project.name}</h3>
                  <p className="text-xs font-semibold text-slate-500">{projectTasks.length} tareas visibles</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAddTask(project.id)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" />
                Agregar tarea
              </button>
            </div>

            <div className="grid gap-3 p-4">
              {projectTasks.map((task) => (
                <TaskCard key={task.id} task={task} onOpen={onOpenTask} onDelete={onDeleteTask} onToggle={onToggleTask} />
              ))}
              {!projectTasks.length && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  No hay tareas para este filtro.
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
