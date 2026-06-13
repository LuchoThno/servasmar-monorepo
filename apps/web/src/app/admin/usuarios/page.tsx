'use client'

import { Save, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useApiClient } from '@/lib/useApiClient'

type AdminRole = 'admin' | 'gestor' | 'visor'
type UserStatus = 'active' | 'inactive'
type PermissionLevel = 'none' | 'read' | 'write' | 'admin'
type PermissionKey = 'clients' | 'projects' | 'tasks' | 'quotes' | 'users'
type Permissions = Record<PermissionKey, PermissionLevel>

type User = {
  id: string
  clerkId: string
  name: string
  email: string
  role: AdminRole
  status: UserStatus
  active: boolean
  permissions: Permissions
  lastLoginAt?: string
  updatedAt: string
}

type UserForm = {
  clerkId?: string
  name: string
  email: string
  role: AdminRole
  status: UserStatus
  permissions: Permissions
}

const defaultPermissions: Permissions = {
  clients: 'none',
  projects: 'none',
  tasks: 'none',
  quotes: 'none',
  users: 'none',
}

const rolePermissions: Record<AdminRole, Permissions> = {
  admin: { clients: 'admin', projects: 'admin', tasks: 'admin', quotes: 'admin', users: 'admin' },
  gestor: { clients: 'write', projects: 'write', tasks: 'write', quotes: 'write', users: 'none' },
  visor: { clients: 'read', projects: 'read', tasks: 'read', quotes: 'read', users: 'none' },
}

const emptyUser: UserForm = {
  name: '',
  email: '',
  role: 'gestor',
  status: 'active',
  permissions: rolePermissions.gestor,
}

const roleInfo: Record<AdminRole, { label: string; description: string; badge: string; className: string }> = {
  admin: {
    label: 'Admin',
    description: 'Acceso total, configuración y usuarios',
    badge: 'máximo acceso',
    className: 'bg-red-50 text-red-800',
  },
  gestor: {
    label: 'Gestor',
    description: 'Clientes, proyectos, tareas y cotizaciones',
    badge: 'acceso operativo',
    className: 'bg-yellow-50 text-yellow-800',
  },
  visor: {
    label: 'Visor',
    description: 'Solo lectura en módulos asignados',
    badge: 'solo lectura',
    className: 'bg-green-50 text-green-800',
  },
}

const statusInfo: Record<UserStatus, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactivo', className: 'bg-red-100 text-red-800' },
}

const permissionLabels: Record<PermissionKey, string> = {
  clients: 'Clientes',
  projects: 'Proyectos',
  tasks: 'Tareas',
  quotes: 'Cotizaciones',
  users: 'Usuarios',
}

const permissionLevelLabels: Record<PermissionLevel, string> = {
  none: 'Sin acceso',
  read: 'Lectura',
  write: 'Escritura',
  admin: 'Admin',
}

const dateLabel = (value?: string) => value ? value.slice(0, 10) : '-'

export default function AdminUsersPage() {
  const { isLoaded, isSignedIn, requestJson } = useApiClient()
  const [users, setUsers] = useState<User[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState<UserForm>(emptyUser)
  const [filters, setFilters] = useState({ search: '', role: '', status: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadUsers = async () => {
    if (!isSignedIn) return
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.role) params.set('role', filters.role)
    if (filters.status) params.set('status', filters.status)
    const data = await requestJson<{ users: User[] }>(`/api/users/admin?${params.toString()}`)
    if (data) setUsers(data.users || [])
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    loadUsers().finally(() => setLoading(false))
  }, [filters, isLoaded, isSignedIn, requestJson])

  const newUser = () => {
    setSelectedId('')
    setForm({ ...emptyUser, permissions: rolePermissions.gestor })
    setMessage('')
    setIsModalOpen(true)
  }

  const selectUser = (user: User) => {
    setSelectedId(user.id)
    setForm({
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      permissions: user.permissions || rolePermissions[user.role],
    })
    setMessage('')
    setIsModalOpen(true)
  }

  const updateRole = (role: AdminRole) => {
    setForm({ ...form, role, permissions: rolePermissions[role] })
  }

  const saveUser = async () => {
    try {
      const url = selectedId ? `/api/users/admin/${selectedId}` : '/api/users/admin'
      const method = selectedId ? 'PUT' : 'POST'
      await requestJson(url, { method, body: JSON.stringify(form) })
      setMessage(selectedId ? 'Usuario actualizado.' : 'Usuario creado en Clerk y sincronizado en Mongo.')
      setIsModalOpen(false)
      await loadUsers()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar el usuario')
    }
  }

  const deleteUser = async () => {
    if (!selectedId) return
    try {
      await requestJson(`/api/users/admin/${selectedId}`, { method: 'DELETE' })
      setSelectedId('')
      setForm({ ...emptyUser, permissions: rolePermissions.gestor })
      setIsModalOpen(false)
      setMessage('Usuario eliminado de Clerk y Mongo.')
      await loadUsers()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos eliminar el usuario')
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">Cargando usuarios...</main>
  }

  return (
    <AdminShell title="Módulo de usuarios">
      <section className="mx-auto grid max-w-7xl gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Usuarios" value={users.length} />
          <Metric label="Activos" value={users.filter((user) => user.status === 'active').length} />
          <Metric label="Inactivos" value={users.filter((user) => user.status === 'inactive').length} />
          <Metric label="Admins" value={users.filter((user) => user.role === 'admin').length} />
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {(Object.keys(roleInfo) as AdminRole[]).map((role) => (
            <div key={role} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-bold text-slate-950">{roleInfo[role].label}</p>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{roleInfo[role].description}</p>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${roleInfo[role].className}`}>{roleInfo[role].badge}</span>
            </div>
          ))}
        </section>

        {message && <p className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">{message}</p>}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_180px_190px_auto]">
            <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Buscar nombre o correo" className="h-11 rounded-md border border-slate-300 px-3 text-sm" />
            <select value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm">
              <option value="">Roles</option>
              {(Object.keys(roleInfo) as AdminRole[]).map((role) => <option key={role} value={role}>{roleInfo[role].label}</option>)}
            </select>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm">
              <option value="">Estados</option>
              {(Object.keys(statusInfo) as UserStatus[]).map((status) => <option key={status} value={status}>{statusInfo[status].label}</option>)}
            </select>
            <button onClick={newUser} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
              Crear usuario
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Permisos</th>
                  <th className="px-4 py-3">Actividad</th>
                  <th className="px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-xs font-black text-white">
                          {user.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-950">{user.name}</p>
                          <p className="text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                    <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {Object.entries(user.permissions || {}).filter(([, level]) => level !== 'none').slice(0, 3).map(([key, level]) => `${permissionLabels[key as PermissionKey]}: ${permissionLevelLabels[level as PermissionLevel]}`).join(' · ') || 'Sin permisos'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <p>Último login: {dateLabel(user.lastLoginAt)}</p>
                      <p>Clerk ID: {user.clerkId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => selectUser(user)} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Editar</button>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No hay usuarios con estos filtros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
            <aside className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{selectedId ? 'Editar usuario' : 'Crear usuario'}</h2>
                  <p className="mt-1 text-sm text-slate-500">Identidad gestionada por Clerk; roles y permisos se guardan en MongoDB.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" aria-label="Cerrar modal">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-5 p-5 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre" className="h-11 rounded-md border border-slate-300 px-3" />
                  <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Correo" className="h-11 rounded-md border border-slate-300 px-3" />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })} className="h-11 rounded-md border border-slate-300 px-3">
                    {(Object.keys(statusInfo) as UserStatus[]).map((status) => <option key={status} value={status}>{statusInfo[status].label}</option>)}
                  </select>
                  <input value={form.clerkId || ''} onChange={(event) => setForm({ ...form, clerkId: event.target.value || undefined })} placeholder="Clerk ID (opcional; se crea automáticamente)" className="h-11 rounded-md border border-slate-300 px-3" />
                </div>

                <section>
                  <p className="mb-3 font-bold text-slate-950">Selector de rol</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {(Object.keys(roleInfo) as AdminRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => updateRole(role)}
                        className={`rounded-lg border p-4 text-left transition ${form.role === role ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <p className="font-bold text-slate-950">{roleInfo[role].label}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-600">{roleInfo[role].description}</p>
                        <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${roleInfo[role].className}`}>{roleInfo[role].badge}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-md border border-slate-200 p-4">
                  <p className="font-bold text-slate-950">Permisos por módulo</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {(Object.keys(permissionLabels) as PermissionKey[]).map((key) => (
                      <label key={key} className="grid gap-1">
                        <span className="text-xs font-bold uppercase text-slate-500">{permissionLabels[key]}</span>
                        <select
                          value={form.permissions[key]}
                          onChange={(event) => setForm({ ...form, permissions: { ...form.permissions, [key]: event.target.value as PermissionLevel } })}
                          className="h-10 rounded-md border border-slate-300 px-3"
                        >
                          {(Object.keys(permissionLevelLabels) as PermissionLevel[]).map((level) => <option key={level} value={level}>{permissionLevelLabels[level]}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>

                <div className="flex flex-wrap justify-end gap-2">
                  {selectedId && (
                    <button onClick={deleteUser} className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-bold text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  )}
                  <button onClick={saveUser} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
                    <Save className="h-4 w-4" />
                    Guardar
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </AdminShell>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function RoleBadge({ role }: { role: AdminRole }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleInfo[role].className}`}>{roleInfo[role].label}</span>
}

function StatusBadge({ status }: { status: UserStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusInfo[status].className}`}>{statusInfo[status].label}</span>
}
