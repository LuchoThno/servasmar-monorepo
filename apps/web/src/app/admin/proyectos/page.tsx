import { Suspense } from 'react'
import { ProjectModule } from '@/components/ProjectModule'
import { AdminShell } from '@/components/admin/AdminShell'

export default function AdminProjectsPage() {
  return (
    <AdminShell title="Proyectos">
      <Suspense fallback={<div className="min-h-[420px] rounded-lg border border-slate-200 bg-white" />}>
        <ProjectModule />
      </Suspense>
    </AdminShell>
  )
}
