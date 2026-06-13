'use client'

import { Anchor, ClipboardList, Leaf, type LucideIcon } from 'lucide-react'
import type { Project } from '@/types/project.types'

const iconMap: Record<string, LucideIcon> = {
  anchor: Anchor,
  leaf: Leaf,
  clipboard: ClipboardList,
}

const statusLabel: Record<Project['status'], string> = {
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
  risk: 'En riesgo',
}

export function ProjectCard({ project }: { project: Project }) {
  const Icon = iconMap[project.icon] || ClipboardList

  return (
    <article className="rounded-[10px] border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ backgroundColor: project.color }}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-slate-950">{project.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.desc}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{statusLabel[project.status]}</span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Kpi label="Avance" value={`${project.pct}%`} />
        <Kpi label="Total" value={project.total} />
        <Kpi label="Done" value={project.done} />
        <Kpi label="Atraso" value={project.overdue} />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${project.pct}%`, backgroundColor: project.color }}
        />
      </div>
    </article>
  )
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  )
}
