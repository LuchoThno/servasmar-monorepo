'use client'

import { SignOutButton, UserButton, useUser } from '@clerk/nextjs'
import { BarChart3, CalendarCheck, FileText, FolderKanban, FolderOpen, Landmark, LayoutDashboard, LogOut, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MouseEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import { useApiClient } from '@/lib/useApiClient'

type PermissionLevel = 'none' | 'read' | 'write' | 'admin'
type PermissionKey = 'clients' | 'projects' | 'tasks' | 'quotes' | 'finance' | 'users'
type AdminProfile = {
  role: string
  permissions?: Record<PermissionKey, PermissionLevel>
}

const navItems = [
  { href: '/admin/crm', label: 'Dashboard', icon: LayoutDashboard, permission: 'clients' },
  { href: '/admin/crm?view=clients', label: 'Clientes', icon: BarChart3, permission: 'clients' },
  { href: '/admin/proyectos', label: 'Proyectos', icon: FolderKanban, permission: 'projects' },
  { href: '/admin/cotizaciones', label: 'Cotizaciones', icon: FileText, permission: 'quotes' },
  { href: '/admin/finanzas', label: 'Finanzas', icon: Landmark, permission: 'finance' },
  { href: '/admin/documentos', label: 'Documentos', icon: FolderOpen, permission: 'finance' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users, permission: 'users' },
  { href: '/admin/citas', label: 'Citas', icon: CalendarCheck, permission: 'tasks' },
] 

const permissionRank: Record<PermissionLevel, number> = { none: 0, read: 1, write: 2, admin: 3 }

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname()
  const { user } = useUser()
  const { isSignedIn, requestJson } = useApiClient()
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [currentHref, setCurrentHref] = useState(pathname)

  useEffect(() => {
    if (!isSignedIn) return
    setAccessDenied(false)
    setProfileLoaded(false)
    requestJson<{ user: AdminProfile }>('/api/users/admin/me')
      .then((data) => {
        if (data?.user) {
          setAdminProfile(data.user)
          return
        }

        setAdminProfile(null)
        setAccessDenied(true)
      })
      .catch(() => {
        setAdminProfile(null)
        setAccessDenied(true)
      })
      .finally(() => setProfileLoaded(true))
  }, [isSignedIn, requestJson])

  useEffect(() => {
    const syncHref = () => setCurrentHref(`${window.location.pathname}${window.location.search}`)
    syncHref()
    window.addEventListener('admin-crm-view-change', syncHref)
    window.addEventListener('popstate', syncHref)
    return () => {
      window.removeEventListener('admin-crm-view-change', syncHref)
      window.removeEventListener('popstate', syncHref)
    }
  }, [pathname])

  const initials = useMemo(() => {
    const email = user?.primaryEmailAddress?.emailAddress
    if (!email) return 'AD'
    return email.slice(0, 2).toUpperCase()
  }, [user])

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/admin/crm') && pathname === '/admin/crm') {
      event.preventDefault()
      window.history.pushState(null, '', href)
      window.dispatchEvent(new Event('admin-crm-view-change'))
    }
  }

  if (!profileLoaded || accessDenied) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-200">
            {accessDenied ? 'Acceso no autorizado' : 'Validando acceso'}
          </p>
          <h1 className="mt-3 text-2xl font-black">
            {accessDenied ? 'Tu usuario no esta inscrito.' : 'Verificando usuario...'}
          </h1>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[292px_1fr]">
      <aside className="border-b border-slate-200 bg-slate-950 text-white shadow-xl lg:min-h-screen lg:border-b-0 lg:border-r lg:border-slate-800">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-white shadow-lg shadow-blue-950/30">
              <img src="/images/logo2.png" alt="SERVASMAR" className="h-full w-full object-contain" />
            </div>
            <div>
              <Link href="/" className="text-base font-black tracking-wide">SERVASMAR</Link>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Ambiente admin</p>
            </div>
          </div>

          <nav className="grid gap-1 px-3 py-4">
            {navItems.filter((item) => {
              if (adminProfile?.role === 'admin') return true
              if (!profileLoaded) return item.permission !== 'users'
              if (!adminProfile) return item.permission !== 'users'
              const level = adminProfile.permissions?.[item.permission as PermissionKey] || 'none'
              return permissionRank[level] >= permissionRank.read
            }).map((item) => {
              const Icon = item.icon
              const isActive = item.href.includes('?') ? currentHref === item.href : pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={(event) => handleNavClick(event, item.href)}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto border-t border-slate-800 p-4">
            <div className="flex items-center gap-3 rounded-md bg-slate-900 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-sm font-black text-slate-950">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{user?.primaryEmailAddress?.emailAddress || 'Administrador'}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">{adminProfile?.role || 'usuario'}</p>
              </div>
              <UserButton />
            </div>
            <SignOutButton redirectUrl="/sign-in">
              <button className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-700 px-4 text-sm font-bold text-slate-200 hover:bg-slate-900">
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        <header className="border-b border-slate-200 bg-white/95 px-4 py-5 backdrop-blur lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Panel administrativo</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">{title}</h1>
        </header>
        <div className="px-4 py-6 lg:px-8">
          {children}
        </div>
      </section>
    </main>
  )
}
