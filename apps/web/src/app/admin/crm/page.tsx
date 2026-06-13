'use client'

import { Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useApiClient } from '@/lib/useApiClient'

type ClientStatus = 'prospecto' | 'activo' | 'inactivo'
type ProjectStatus = 'prospecto' | 'en_progreso' | 'pausado' | 'cerrado' | 'perdido'
type ValueStatus = 'pendiente' | 'facturado' | 'pagado'
type ValueType = 'ingreso' | 'egreso'
type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'bloqueada'

type Contact = {
  name: string
  role: string
  email: string
  phone: string
  notes: string
}

type CrmClient = {
  _id: string
  name: string
  taxId: string
  industry: string
  status: ClientStatus
  email: string
  phone: string
  address: string
  notes: string
  contacts: Contact[]
  updatedAt: string
}

type ProjectValue = {
  label: string
  amount: number
  currency: string
  type: ValueType
  dueDate: string
  status: ValueStatus
  notes: string
}

type ProjectTask = {
  title: string
  owner: string
  dueDate: string
  status: TaskStatus
  notes: string
}

type ClientSummary = Pick<CrmClient, '_id' | 'name' | 'taxId' | 'email'>

type CrmProject = {
  _id: string
  clientId: string | ClientSummary
  name: string
  serviceType: string
  status: ProjectStatus
  startDate?: string
  endDate?: string
  description: string
  values: ProjectValue[]
  tasks: ProjectTask[]
  updatedAt: string
}

type Summary = {
  clients: number
  activeClients: number
  projects: number
  openProjects: number
  finance: Array<{ _id: { currency: string; type: ValueType }; total: number }>
  taskKpis: Array<{ _id: TaskStatus; total: number }>
}

type ClientForm = Omit<CrmClient, '_id' | 'updatedAt'>
type ProjectForm = Omit<CrmProject, '_id' | 'updatedAt' | 'clientId'> & { clientId: string }

const emptyContact: Contact = { name: '', role: '', email: '', phone: '', notes: '' }
const emptyValue: ProjectValue = { label: '', amount: 0, currency: 'CLP', type: 'ingreso', dueDate: '', status: 'pendiente', notes: '' }
const emptyTask: ProjectTask = { title: '', owner: '', dueDate: '', status: 'pendiente', notes: '' }
const emptyClient: ClientForm = {
  name: '',
  taxId: '',
  industry: '',
  status: 'prospecto',
  email: '',
  phone: '',
  address: '',
  notes: '',
  contacts: [],
}
const emptyProject: ProjectForm = {
  clientId: '',
  name: '',
  serviceType: '',
  status: 'prospecto',
  startDate: '',
  endDate: '',
  description: '',
  values: [],
  tasks: [],
}
const emptySummary: Summary = { clients: 0, activeClients: 0, projects: 0, openProjects: 0, finance: [], taskKpis: [] }

const toInputDate = (value?: string) => (value ? value.slice(0, 10) : '')
const getClientId = (project: CrmProject) => (typeof project.clientId === 'string' ? project.clientId : project.clientId._id)
const getClientName = (project: CrmProject) => (typeof project.clientId === 'string' ? 'Cliente asociado' : project.clientId.name)
const money = (amount: number, currency: string) => new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(amount || 0)

export default function AdminCrmPage() {
  const { isLoaded, isSignedIn, requestJson } = useApiClient()
  const [tab, setTab] = useState<'dashboard' | 'clients' | 'projects'>('dashboard')
  const [clients, setClients] = useState<CrmClient[]>([])
  const [projects, setProjects] = useState<CrmProject[]>([])
  const [summary, setSummary] = useState<Summary>(emptySummary)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient)
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [clientFilters, setClientFilters] = useState({ search: '', status: '' })
  const [projectFilters, setProjectFilters] = useState({ search: '', status: '', clientId: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const loadSummary = async () => {
    if (!isSignedIn) return
    const data = await requestJson<{ summary: Summary }>('/api/crm/admin/summary')
    if (data) setSummary(data.summary)
  }

  const loadClients = async () => {
    if (!isSignedIn) return
    const params = new URLSearchParams()
    if (clientFilters.search) params.set('search', clientFilters.search)
    if (clientFilters.status) params.set('status', clientFilters.status)
    const data = await requestJson<{ clients: CrmClient[] }>(`/api/crm/admin/clients?${params.toString()}`)
    if (data) setClients(data.clients || [])
  }

  const loadProjects = async () => {
    if (!isSignedIn) return
    const params = new URLSearchParams()
    if (projectFilters.search) params.set('search', projectFilters.search)
    if (projectFilters.status) params.set('status', projectFilters.status)
    if (projectFilters.clientId) params.set('clientId', projectFilters.clientId)
    const data = await requestJson<{ projects: CrmProject[] }>(`/api/crm/admin/projects?${params.toString()}`)
    if (data) setProjects(data.projects || [])
  }

  useEffect(() => {
    const syncView = () => {
      const view = new URLSearchParams(window.location.search).get('view')
      if (view === 'clients' || view === 'projects') {
        setTab(view)
        return
      }
      setTab('dashboard')
    }
    syncView()
    window.addEventListener('admin-crm-view-change', syncView)
    window.addEventListener('popstate', syncView)
    return () => {
      window.removeEventListener('admin-crm-view-change', syncView)
      window.removeEventListener('popstate', syncView)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    Promise.all([loadSummary(), loadClients(), loadProjects()]).finally(() => setLoading(false))
  }, [clientFilters, isLoaded, isSignedIn, projectFilters, requestJson])

  const refresh = async () => {
    await Promise.all([loadSummary(), loadClients(), loadProjects()])
  }

  const selectClient = (client: CrmClient) => {
    setSelectedClientId(client._id)
    setClientForm({
      name: client.name || '',
      taxId: client.taxId || '',
      industry: client.industry || '',
      status: client.status,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      notes: client.notes || '',
      contacts: client.contacts || [],
    })
    setTab('clients')
    setMessage('')
    setIsClientModalOpen(true)
  }

  const newClient = () => {
    setSelectedClientId('')
    setClientForm(emptyClient)
    setTab('clients')
    setMessage('')
    setIsClientModalOpen(true)
  }

  const saveClient = async () => {
    try {
      const url = selectedClientId ? `/api/crm/admin/clients/${selectedClientId}` : '/api/crm/admin/clients'
      const method = selectedClientId ? 'PUT' : 'POST'
      const data = await requestJson<{ client: CrmClient }>(url, {
        method,
        body: JSON.stringify(clientForm),
      })
      if (!data) return
      setSelectedClientId(data.client._id)
      setMessage('Cliente guardado.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar el cliente')
    }
  }

  const deleteClient = async () => {
    if (!selectedClientId) return
    try {
      await requestJson(`/api/crm/admin/clients/${selectedClientId}`, { method: 'DELETE' })
      setSelectedClientId('')
      setClientForm(emptyClient)
      setIsClientModalOpen(false)
      setMessage('Cliente eliminado junto a sus proyectos asociados.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos eliminar el cliente')
    }
  }

  const selectProject = (project: CrmProject) => {
    setSelectedProjectId(project._id)
    setProjectForm({
      clientId: getClientId(project),
      name: project.name || '',
      serviceType: project.serviceType || '',
      status: project.status,
      startDate: toInputDate(project.startDate),
      endDate: toInputDate(project.endDate),
      description: project.description || '',
      values: (project.values || []).map((value) => ({ ...value, type: value.type || 'ingreso', dueDate: toInputDate(value.dueDate) })),
      tasks: (project.tasks || []).map((task) => ({ ...task, dueDate: toInputDate(task.dueDate) })),
    })
    setTab('projects')
    setMessage('')
    setIsProjectModalOpen(true)
  }

  const newProject = (clientId = '') => {
    setSelectedProjectId('')
    setProjectForm({ ...emptyProject, clientId })
    setTab('projects')
    setMessage('')
    setIsProjectModalOpen(true)
  }

  const saveProject = async () => {
    try {
      const url = selectedProjectId ? `/api/crm/admin/projects/${selectedProjectId}` : '/api/crm/admin/projects'
      const method = selectedProjectId ? 'PUT' : 'POST'
      const data = await requestJson<{ project: CrmProject }>(url, {
        method,
        body: JSON.stringify(projectForm),
      })
      if (!data) return
      setSelectedProjectId(data.project._id)
      setMessage('Proyecto guardado.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar el proyecto')
    }
  }

  const deleteProject = async () => {
    if (!selectedProjectId) return
    try {
      await requestJson(`/api/crm/admin/projects/${selectedProjectId}`, { method: 'DELETE' })
      setSelectedProjectId('')
      setProjectForm(emptyProject)
      setIsProjectModalOpen(false)
      setMessage('Proyecto eliminado.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos eliminar el proyecto')
    }
  }

  const selectedClientProjects = useMemo(
    () => (selectedClientId ? projects.filter((project) => getClientId(project) === selectedClientId) : []),
    [projects, selectedClientId]
  )

  const projectTotal = useMemo(
    () => projectForm.values.reduce((total, value) => total + (value.type === 'egreso' ? -Number(value.amount || 0) : Number(value.amount || 0)), 0),
    [projectForm.values]
  )

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">Cargando CRM...</main>
  }

  const primaryCurrency = summary.finance[0]?._id.currency || 'CLP'
  const income = summary.finance
    .filter((item) => item._id.type === 'ingreso')
    .reduce((total, item) => total + item.total, 0)
  const expenses = summary.finance
    .filter((item) => item._id.type === 'egreso')
    .reduce((total, item) => total + item.total, 0)
  const taskTotals = summary.taskKpis.reduce<Record<TaskStatus, number>>(
    (totals, item) => ({ ...totals, [item._id]: item.total }),
    { pendiente: 0, en_progreso: 0, completada: 0, bloqueada: 0 }
  )

  return (
    <AdminShell title="CRM administrativo">
      <section className="mx-auto grid max-w-7xl gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Clientes" value={summary.clients} />
          <Metric label="Activos" value={summary.activeClients} />
          <Metric label="Proyectos" value={summary.projects} />
          <Metric label="Abiertos" value={summary.openProjects} />
        </div>

        {message && <p className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">{message}</p>}

        {tab === 'dashboard' && (
          <DashboardView
            clients={clients}
            projects={projects}
            income={income}
            expenses={expenses}
            currency={primaryCurrency}
            taskTotals={taskTotals}
            onSelectClient={selectClient}
            onSelectProject={selectProject}
          />
        )}

        {tab === 'clients' && (
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_180px_auto]">
              <input value={clientFilters.search} onChange={(event) => setClientFilters({ ...clientFilters, search: event.target.value })} placeholder="Buscar cliente, RUT, correo o contacto" className="h-11 rounded-md border border-slate-300 px-3 text-sm" />
              <select value={clientFilters.status} onChange={(event) => setClientFilters({ ...clientFilters, status: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm">
                <option value="">Todos</option>
                <option value="prospecto">Prospecto</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
              <button onClick={newClient} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
                <Plus className="h-4 w-4" />
                Cliente
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Proyectos</th>
                    <th className="px-4 py-3">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client._id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-950">{client.name}</p>
                        <p className="text-slate-500">{client.taxId || client.industry || 'Sin datos comerciales'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{client.email || 'Sin correo'}</p>
                        <p className="text-slate-500">{client.phone || 'Sin telefono'}</p>
                      </td>
                      <td className="px-4 py-3"><ClientBadge status={client.status} /></td>
                      <td className="px-4 py-3">{projects.filter((project) => getClientId(project) === client._id).length}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => selectClient(client)} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Editar</button>
                      </td>
                    </tr>
                  ))}
                  {!clients.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No hay clientes con estos filtros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'projects' && (
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_160px_180px_auto]">
              <input value={projectFilters.search} onChange={(event) => setProjectFilters({ ...projectFilters, search: event.target.value })} placeholder="Buscar proyecto o servicio" className="h-11 rounded-md border border-slate-300 px-3 text-sm" />
              <select value={projectFilters.status} onChange={(event) => setProjectFilters({ ...projectFilters, status: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm">
                <option value="">Estados</option>
                <option value="prospecto">Prospecto</option>
                <option value="en_progreso">En progreso</option>
                <option value="pausado">Pausado</option>
                <option value="cerrado">Cerrado</option>
                <option value="perdido">Perdido</option>
              </select>
              <select value={projectFilters.clientId} onChange={(event) => setProjectFilters({ ...projectFilters, clientId: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm">
                <option value="">Clientes</option>
                {clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
              </select>
              <button onClick={() => newProject()} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
                <Plus className="h-4 w-4" />
                Proyecto
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Proyecto</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const total = project.values.reduce((sum, value) => sum + (value.type === 'egreso' ? -Number(value.amount || 0) : Number(value.amount || 0)), 0)
                    const currency = project.values[0]?.currency || 'CLP'
                    return (
                      <tr key={project._id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-950">{project.name}</p>
                          <p className="text-slate-500">{project.serviceType || 'Sin tipo de servicio'}</p>
                        </td>
                        <td className="px-4 py-3">{getClientName(project)}</td>
                        <td className="px-4 py-3"><ProjectBadge status={project.status} /></td>
                        <td className="px-4 py-3">{money(total, currency)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => selectProject(project)} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Editar</button>
                        </td>
                      </tr>
                    )
                  })}
                  {!projects.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No hay proyectos con estos filtros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {isClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
            <ClientEditor
              form={clientForm}
              setForm={setClientForm}
              selected={Boolean(selectedClientId)}
              selectedProjects={selectedClientProjects}
              onSave={saveClient}
              onDelete={deleteClient}
              onClose={() => setIsClientModalOpen(false)}
              onNewProject={() => {
                setIsClientModalOpen(false)
                newProject(selectedClientId)
              }}
              onSelectProject={(project) => {
                setIsClientModalOpen(false)
                selectProject(project)
              }}
            />
          </div>
        )}

        {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
            <ProjectEditor
              form={projectForm}
              setForm={setProjectForm}
              clients={clients}
              selected={Boolean(selectedProjectId)}
              total={projectTotal}
              onSave={saveProject}
              onDelete={deleteProject}
              onClose={() => setIsProjectModalOpen(false)}
            />
          </div>
        )}
      </section>
    </AdminShell>
  )
}

function ClientEditor({
  form,
  setForm,
  selected,
  selectedProjects,
  onSave,
  onDelete,
  onClose,
  onNewProject,
  onSelectProject,
}: {
  form: ClientForm
  setForm: (form: ClientForm) => void
  selected: boolean
  selectedProjects: CrmProject[]
  onSave: () => void
  onDelete: () => void
  onClose: () => void
  onNewProject: () => void
  onSelectProject: (project: CrmProject) => void
}) {
  const updateContact = (index: number, contact: Contact) => {
    setForm({ ...form, contacts: form.contacts.map((current, currentIndex) => currentIndex === index ? contact : current) })
  }

  return (
    <aside className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <h2 className="text-lg font-bold text-slate-950">{selected ? 'Editar cliente' : 'Nuevo cliente'}</h2>
        <div className="flex gap-2">
          {selected && (
            <button onClick={onDelete} className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-bold text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          )}
          <button onClick={onSave} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
            <Save className="h-4 w-4" />
            Guardar
          </button>
          <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" aria-label="Cerrar modal de cliente">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-5 text-sm">
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre del cliente" className="h-11 rounded-md border border-slate-300 px-3" />
        <div className="grid gap-3 md:grid-cols-2">
          <input value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value })} placeholder="RUT / ID tributario" className="h-11 rounded-md border border-slate-300 px-3" />
          <input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} placeholder="Rubro" className="h-11 rounded-md border border-slate-300 px-3" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Correo general" className="h-11 rounded-md border border-slate-300 px-3" />
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Telefono general" className="h-11 rounded-md border border-slate-300 px-3" />
        </div>
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ClientStatus })} className="h-11 rounded-md border border-slate-300 px-3">
          <option value="prospecto">Prospecto</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Direccion" className="h-11 rounded-md border border-slate-300 px-3" />
        <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} placeholder="Notas comerciales" className="resize-none rounded-md border border-slate-300 px-3 py-2" />

        <div className="rounded-md border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-950">Contactos</p>
            <button onClick={() => setForm({ ...form, contacts: [...form.contacts, emptyContact] })} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">
              Agregar contacto
            </button>
          </div>
          <div className="mt-3 grid gap-3">
            {form.contacts.map((contact, index) => (
              <div key={index} className="grid gap-2 rounded-md bg-slate-50 p-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <input value={contact.name} onChange={(event) => updateContact(index, { ...contact, name: event.target.value })} placeholder="Nombre" className="h-10 rounded-md border border-slate-300 px-3" />
                  <input value={contact.role} onChange={(event) => updateContact(index, { ...contact, role: event.target.value })} placeholder="Cargo" className="h-10 rounded-md border border-slate-300 px-3" />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input value={contact.email} onChange={(event) => updateContact(index, { ...contact, email: event.target.value })} placeholder="Correo" className="h-10 rounded-md border border-slate-300 px-3" />
                  <input value={contact.phone} onChange={(event) => updateContact(index, { ...contact, phone: event.target.value })} placeholder="Telefono" className="h-10 rounded-md border border-slate-300 px-3" />
                </div>
                <input value={contact.notes} onChange={(event) => updateContact(index, { ...contact, notes: event.target.value })} placeholder="Notas" className="h-10 rounded-md border border-slate-300 px-3" />
                <button onClick={() => setForm({ ...form, contacts: form.contacts.filter((_, currentIndex) => currentIndex !== index) })} className="justify-self-start text-xs font-bold text-red-700">
                  Quitar contacto
                </button>
              </div>
            ))}
            {!form.contacts.length && <p className="text-sm text-slate-500">Sin contactos registrados.</p>}
          </div>
        </div>

        {selected && (
          <div className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-950">Proyectos asociados</p>
              <button onClick={onNewProject} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">
                Crear proyecto
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {selectedProjects.map((project) => (
                <button key={project._id} onClick={() => onSelectProject(project)} className="block w-full rounded-md bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100">
                  <strong>{project.name}</strong>
                  <span className="ml-2 text-slate-500">{project.status}</span>
                </button>
              ))}
              {!selectedProjects.length && <p className="text-sm text-slate-500">Este cliente aun no tiene proyectos.</p>}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function DashboardView({
  clients,
  projects,
  income,
  expenses,
  currency,
  taskTotals,
  onSelectClient,
  onSelectProject,
}: {
  clients: CrmClient[]
  projects: CrmProject[]
  income: number
  expenses: number
  currency: string
  taskTotals: Record<TaskStatus, number>
  onSelectClient: (client: CrmClient) => void
  onSelectProject: (project: CrmProject) => void
}) {
  const latestClients = clients.slice(0, 8)
  const latestProjects = projects.slice(0, 6)

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <FinanceCard label="Ingresos" value={income} currency={currency} tone="border-green-200 bg-green-50 text-green-900" />
        <FinanceCard label="Egresos" value={expenses} currency={currency} tone="border-red-200 bg-red-50 text-red-900" />
        <FinanceCard label="Margen" value={income - expenses} currency={currency} tone="border-blue-200 bg-blue-50 text-blue-900" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <TaskKpi label="Pendientes" value={taskTotals.pendiente} tone="bg-yellow-50 text-yellow-800 border-yellow-200" />
        <TaskKpi label="En progreso" value={taskTotals.en_progreso} tone="bg-blue-50 text-blue-800 border-blue-200" />
        <TaskKpi label="Completadas" value={taskTotals.completada} tone="bg-green-50 text-green-800 border-green-200" />
        <TaskKpi label="Bloqueadas" value={taskTotals.bloqueada} tone="bg-red-50 text-red-800 border-red-200" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-bold text-slate-950">Clientes recientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Proyectos</th>
                  <th className="px-4 py-3">Accion</th>
                </tr>
              </thead>
              <tbody>
                {latestClients.map((client) => (
                  <tr key={client._id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-950">{client.name}</p>
                      <p className="text-slate-500">{client.taxId || client.industry || 'Sin datos comerciales'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{client.email || 'Sin correo'}</p>
                      <p className="text-slate-500">{client.phone || 'Sin telefono'}</p>
                    </td>
                    <td className="px-4 py-3"><ClientBadge status={client.status} /></td>
                    <td className="px-4 py-3">{projects.filter((project) => getClientId(project) === client._id).length}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => onSelectClient(client)} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Abrir</button>
                    </td>
                  </tr>
                ))}
                {!latestClients.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">Aun no hay clientes registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-bold text-slate-950">Proyectos activos</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {latestProjects.map((project) => {
              const projectIncome = project.values
                .filter((value) => value.type !== 'egreso')
                .reduce((total, value) => total + Number(value.amount || 0), 0)
              const projectExpenses = project.values
                .filter((value) => value.type === 'egreso')
                .reduce((total, value) => total + Number(value.amount || 0), 0)
              const projectCurrency = project.values[0]?.currency || currency
              return (
                <button key={project._id} onClick={() => onSelectProject(project)} className="block w-full px-4 py-4 text-left hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{project.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{getClientName(project)} · {project.serviceType || 'Servicio sin clasificar'}</p>
                    </div>
                    <ProjectBadge status={project.status} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                    <span>Ingresos: <strong>{money(projectIncome, projectCurrency)}</strong></span>
                    <span>Egresos: <strong>{money(projectExpenses, projectCurrency)}</strong></span>
                    <span>Tareas: <strong>{project.tasks?.length || 0}</strong></span>
                  </div>
                </button>
              )
            })}
            {!latestProjects.length && <p className="p-6 text-sm text-slate-500">Aun no hay proyectos registrados.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

function ProjectEditor({
  form,
  setForm,
  clients,
  selected,
  total,
  onSave,
  onDelete,
  onClose,
}: {
  form: ProjectForm
  setForm: (form: ProjectForm) => void
  clients: CrmClient[]
  selected: boolean
  total: number
  onSave: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const updateValue = (index: number, value: ProjectValue) => {
    setForm({ ...form, values: form.values.map((current, currentIndex) => currentIndex === index ? value : current) })
  }
  const updateTask = (index: number, task: ProjectTask) => {
    setForm({ ...form, tasks: form.tasks.map((current, currentIndex) => currentIndex === index ? task : current) })
  }

  return (
    <aside className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{selected ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Total: {money(total, form.values[0]?.currency || 'CLP')}</p>
        </div>
        <div className="flex gap-2">
          {selected && (
            <button onClick={onDelete} className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-bold text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          )}
          <button onClick={onSave} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
            <Save className="h-4 w-4" />
            Guardar
          </button>
          <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" aria-label="Cerrar modal de proyecto">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-5 text-sm">
        <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3">
          <option value="">Selecciona cliente</option>
          {clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
        </select>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre del proyecto" className="h-11 rounded-md border border-slate-300 px-3" />
        <input value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })} placeholder="Tipo de servicio" className="h-11 rounded-md border border-slate-300 px-3" />
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })} className="h-11 rounded-md border border-slate-300 px-3">
          <option value="prospecto">Prospecto</option>
          <option value="en_progreso">En progreso</option>
          <option value="pausado">Pausado</option>
          <option value="cerrado">Cerrado</option>
          <option value="perdido">Perdido</option>
        </select>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-bold uppercase text-slate-500">
            Inicio
            <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-950" />
          </label>
          <label className="text-xs font-bold uppercase text-slate-500">
            Termino
            <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-950" />
          </label>
        </div>
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} placeholder="Descripcion / alcance" className="resize-none rounded-md border border-slate-300 px-3 py-2" />

        <div className="rounded-md border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-950">Valores</p>
            <button onClick={() => setForm({ ...form, values: [...form.values, emptyValue] })} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">
              Agregar valor
            </button>
          </div>
          <div className="mt-3 grid gap-3">
            {form.values.map((value, index) => (
              <div key={index} className="grid gap-2 rounded-md bg-slate-50 p-3">
                <input value={value.label} onChange={(event) => updateValue(index, { ...value, label: event.target.value })} placeholder="Concepto" className="h-10 rounded-md border border-slate-300 px-3" />
                <div className="grid gap-2 md:grid-cols-4">
                  <input type="number" min={0} value={value.amount} onChange={(event) => updateValue(index, { ...value, amount: Number(event.target.value) })} placeholder="Monto" className="h-10 rounded-md border border-slate-300 px-3" />
                  <input value={value.currency} onChange={(event) => updateValue(index, { ...value, currency: event.target.value.toUpperCase() })} placeholder="CLP" className="h-10 rounded-md border border-slate-300 px-3" />
                  <select value={value.type} onChange={(event) => updateValue(index, { ...value, type: event.target.value as ValueType })} className="h-10 rounded-md border border-slate-300 px-3">
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                  <input type="date" value={value.dueDate} onChange={(event) => updateValue(index, { ...value, dueDate: event.target.value })} className="h-10 rounded-md border border-slate-300 px-3" />
                </div>
                <select value={value.status} onChange={(event) => updateValue(index, { ...value, status: event.target.value as ValueStatus })} className="h-10 rounded-md border border-slate-300 px-3">
                  <option value="pendiente">Pendiente</option>
                  <option value="facturado">Facturado</option>
                  <option value="pagado">Pagado</option>
                </select>
                <input value={value.notes} onChange={(event) => updateValue(index, { ...value, notes: event.target.value })} placeholder="Notas del valor" className="h-10 rounded-md border border-slate-300 px-3" />
                <button onClick={() => setForm({ ...form, values: form.values.filter((_, currentIndex) => currentIndex !== index) })} className="justify-self-start text-xs font-bold text-red-700">
                  Quitar valor
                </button>
              </div>
            ))}
            {!form.values.length && <p className="text-sm text-slate-500">Sin valores registrados.</p>}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-950">Tareas</p>
            <button onClick={() => setForm({ ...form, tasks: [...form.tasks, emptyTask] })} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">
              Agregar tarea
            </button>
          </div>
          <div className="mt-3 grid gap-3">
            {form.tasks.map((task, index) => (
              <div key={index} className="grid gap-2 rounded-md bg-slate-50 p-3">
                <input value={task.title} onChange={(event) => updateTask(index, { ...task, title: event.target.value })} placeholder="Tarea" className="h-10 rounded-md border border-slate-300 px-3" />
                <div className="grid gap-2 md:grid-cols-3">
                  <input value={task.owner} onChange={(event) => updateTask(index, { ...task, owner: event.target.value })} placeholder="Responsable" className="h-10 rounded-md border border-slate-300 px-3" />
                  <input type="date" value={task.dueDate} onChange={(event) => updateTask(index, { ...task, dueDate: event.target.value })} className="h-10 rounded-md border border-slate-300 px-3" />
                  <select value={task.status} onChange={(event) => updateTask(index, { ...task, status: event.target.value as TaskStatus })} className="h-10 rounded-md border border-slate-300 px-3">
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En progreso</option>
                    <option value="completada">Completada</option>
                    <option value="bloqueada">Bloqueada</option>
                  </select>
                </div>
                <input value={task.notes} onChange={(event) => updateTask(index, { ...task, notes: event.target.value })} placeholder="Notas de tarea" className="h-10 rounded-md border border-slate-300 px-3" />
                <button onClick={() => setForm({ ...form, tasks: form.tasks.filter((_, currentIndex) => currentIndex !== index) })} className="justify-self-start text-xs font-bold text-red-700">
                  Quitar tarea
                </button>
              </div>
            ))}
            {!form.tasks.length && <p className="text-sm text-slate-500">Sin tareas registradas.</p>}
          </div>
        </div>
      </div>
    </aside>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  )
}

function FinanceCard({ label, value, currency, tone }: { label: string; value: number; currency: string; tone: string }) {
  return (
    <div className={`rounded-lg border p-5 ${tone}`}>
      <p className="text-sm font-bold uppercase tracking-wide">{label}</p>
      <p className="mt-3 text-3xl font-black">{money(value, currency)}</p>
    </div>
  )
}

function TaskKpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  )
}

function ClientBadge({ status }: { status: ClientStatus }) {
  const classes = {
    prospecto: 'bg-blue-100 text-blue-800',
    activo: 'bg-green-100 text-green-800',
    inactivo: 'bg-slate-100 text-slate-700',
  }
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${classes[status]}`}>{status}</span>
}

function ProjectBadge({ status }: { status: ProjectStatus }) {
  const classes = {
    prospecto: 'bg-blue-100 text-blue-800',
    en_progreso: 'bg-green-100 text-green-800',
    pausado: 'bg-yellow-100 text-yellow-800',
    cerrado: 'bg-slate-100 text-slate-700',
    perdido: 'bg-red-100 text-red-800',
  }
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${classes[status]}`}>{status.replace('_', ' ')}</span>
}
