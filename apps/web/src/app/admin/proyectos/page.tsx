import { Suspense } from 'react'
import { ProjectModule } from '@/components/ProjectModule'

export default function AdminProjectsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-100" />}>
      <ProjectModule />
    </Suspense>
  )
}
