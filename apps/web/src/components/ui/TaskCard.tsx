'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Eye, Paperclip, Trash2 } from 'lucide-react'
import { memo } from 'react'
import type { Task } from '@/types/project.types'

const priorityColor = {
  high: '#E24B4A',
  medium: '#BA7517',
  low: '#3B6D11',
}

const tagClasses: Record<string, string> = {
  purple: 'bg-violet-100 text-violet-800',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  coral: 'bg-rose-100 text-rose-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-slate-100 text-slate-700',
}

const avatarClasses = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600']

type TaskCardProps = {
  task: Task
  onOpen: (task: Task) => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
}

function TaskCardBase({ task, onOpen, onDelete, onToggle }: TaskCardProps) {
  const doneSubtasks = task.subtasks.filter((subtask) => subtask.done).length
  const isDone = task.status === 'done'

  return (
    <article
      className="group relative rounded-[10px] border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderLeft: `3px solid ${priorityColor[task.priority]}` }}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${isDone ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white hover:border-emerald-600'}`}
          aria-label={isDone ? 'Reabrir tarea' : 'Completar tarea'}
        >
          {isDone && <span className="h-2 w-2 rounded-full bg-white" />}
        </button>

        <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
          <h4 className={`text-sm font-black text-slate-950 ${isDone ? 'text-slate-400 line-through' : ''}`}>{task.name}</h4>
          {task.desc && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.desc}</p>}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 pl-8 text-xs font-bold">
        <span className={`rounded-full px-2.5 py-1 ${tagClasses[task.tagColor] || tagClasses.gray}`}>{task.tag}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{doneSubtasks}/{task.subtasks.length} subtareas</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{format(parseISO(task.date), 'd MMM', { locale: es })}</span>
        {task.attachments.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
            <Paperclip className="h-3 w-3" />
            {task.attachments.length}
          </span>
        )}
        <div className="ml-auto flex -space-x-2">
          {task.assignees.map((assignee, index) => (
            <span key={`${task.id}-${assignee}`} className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white text-[9px] font-black text-white ${avatarClasses[index % avatarClasses.length]}`}>
              {assignee.slice(0, 2)}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute right-3 top-3 flex opacity-0 transition group-hover:opacity-100">
        <button type="button" onClick={() => onOpen(task)} className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm hover:text-blue-700" aria-label="Ver detalle">
          <Eye className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onDelete(task.id)} className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm hover:text-red-700" aria-label="Eliminar">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  )
}

export const TaskCard = memo(TaskCardBase)
