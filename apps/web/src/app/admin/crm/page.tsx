'use client'

import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, FolderKanban, Plus, Save, Target, Trash2, TrendingDown, TrendingUp, Users, X, type LucideIcon } from 'lucide-react'
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
  const [clientError, setClientError] = useState('')
  const [projectError, setProjectError] = useState('')
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
    Promise.all([loadSummary(), loadClients(), loadProjects()])
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No pudimos cargar el CRM'))
      .finally(() => setLoading(false))
  }, [clientFilters, isLoaded, isSignedIn, projectFilters, requestJson])

  const refresh = async () => {
    try {
      await Promise.all([loadSummary(), loadClients(), loadProjects()])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos actualizar el CRM')
    }
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
    setClientError('')
    setIsClientModalOpen(true)
  }

  const newClient = () => {
    setSelectedClientId('')
    setClientForm(emptyClient)
    setTab('clients')
    setMessage('')
    setClientError('')
    setIsClientModalOpen(true)
  }

  const validateClient = () => {
    if (!clientForm.name.trim() || clientForm.name.trim().length < 2) {
      return 'Ingresa el nombre del cliente con al menos 2 caracteres.'
    }
    if (clientForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientForm.email.trim())) {
      return 'El correo general del cliente no tiene un formato válido.'
    }
    const incompleteContactIndex = clientForm.contacts.findIndex((contact) => {
      const hasAnyData = Boolean(contact.name.trim() || contact.role.trim() || contact.email.trim() || contact.phone.trim() || contact.notes.trim())
      return hasAnyData && contact.name.trim().length < 2
    })
    if (incompleteContactIndex >= 0) {
      return `El contacto ${incompleteContactIndex + 1} necesita un nombre de al menos 2 caracteres, o elimina ese contacto.`
    }
    const invalidContactEmailIndex = clientForm.contacts.findIndex((contact) => (
      contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())
    ))
    if (invalidContactEmailIndex >= 0) {
      return `El correo del contacto ${invalidContactEmailIndex + 1} no tiene un formato válido.`
    }
    return ''
  }

  const saveClient = async () => {
    try {
      const validationError = validateClient()
      if (validationError) {
        setClientError(validationError)
        return
      }
      const url = selectedClientId ? `/api/crm/admin/clients/${selectedClientId}` : '/api/crm/admin/clients'
      const method = selectedClientId ? 'PUT' : 'POST'
      const sanitizedClient = {
        ...clientForm,
        name: clientForm.name.trim(),
        email: clientForm.email.trim(),
        contacts: clientForm.contacts
          .map((contact) => ({
            ...contact,
            name: contact.name.trim(),
            email: contact.email.trim(),
          }))
          .filter((contact) => contact.name || contact.role.trim() || contact.email || contact.phone.trim() || contact.notes.trim()),
      }
      const data = await requestJson<{ client: CrmClient }>(url, {
        method,
        body: JSON.stringify(sanitizedClient),
      })
      if (!data) return
      setSelectedClientId(data.client._id)
      setClientError('')
      setMessage('Cliente guardado.')
      await refresh()
    } catch (error) {
      setClientError(error instanceof Error ? error.message : 'No pudimos guardar el cliente')
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
    setProjectError('')
    setIsProjectModalOpen(true)
  }

  const newProject = (clientId = '') => {
    setSelectedProjectId('')
    setProjectForm({ ...emptyProject, clientId })
    setTab('projects')
    setMessage('')
    setProjectError('')
    setIsProjectModalOpen(true)
  }

  const validateProject = () => {
    if (!projectForm.clientId) return 'Selecciona un cliente para asociar el proyecto.'
    if (!projectForm.name.trim() || projectForm.name.trim().length < 2) {
      return 'Ingresa el nombre del proyecto con al menos 2 caracteres.'
    }
    const invalidValueIndex = projectForm.values.findIndex((value) => (
      !value.label.trim() || value.label.trim().length < 2 || Number(value.amount) < 0
    ))
    if (invalidValueIndex >= 0) {
      return `El valor ${invalidValueIndex + 1} necesita una descripción de al menos 2 caracteres y un monto válido.`
    }
    const invalidTaskIndex = projectForm.tasks.findIndex((task) => !task.title.trim() || task.title.trim().length < 2)
    if (invalidTaskIndex >= 0) {
      return `La tarea ${invalidTaskIndex + 1} necesita un título de al menos 2 caracteres.`
    }
    return ''
  }

  const saveProject = async () => {
    try {
      const validationError = validateProject()
      if (validationError) {
        setProjectError(validationError)
        return
      }
      const url = selectedProjectId ? `/api/crm/admin/projects/${selectedProjectId}` : '/api/crm/admin/projects'
      const method = selectedProjectId ? 'PUT' : 'POST'
      const sanitizedProject = {
        ...projectForm,
        name: projectForm.name.trim(),
        serviceType: projectForm.serviceType.trim(),
        description: projectForm.description.trim(),
        values: projectForm.values.map((value) => ({ ...value, label: value.label.trim(), notes: value.notes.trim() })),
        tasks: projectForm.tasks.map((task) => ({ ...task, title: task.title.trim(), owner: task.owner.trim(), notes: task.notes.trim() })),
      }
      const data = await requestJson<{ project: CrmProject }>(url, {
        method,
        body: JSON.stringify(sanitizedProject),
      })
      if (!data) return
      setSelectedProjectId(data.project._id)
      setProjectError('')
      setMessage('Proyecto guardado.')
      await refresh()
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : 'No pudimos guardar el proyecto')
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Clientes" value={summary.clients} detail={`${summary.activeClients} activos`} tone="blue" icon={Users} />
          <Metric label="Activos" value={summary.activeClients} detail={`${summary.clients ? Math.round(summary.activeClients / summary.clients * 100) : 0}% cartera`} tone="green" icon={Activity} />
          <Metric label="Proyectos" value={summary.projects} detail={`${summary.openProjects} abiertos`} tone="violet" icon={FolderKanban} />
          <Metric label="Abiertos" value={summary.openProjects} detail="pipeline operativo" tone="amber" icon={Target} />
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
              error={clientError}
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
              error={projectError}
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
  error,
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
  error: string
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

  const sectionLinks = [
    { href: '#cliente-general', label: 'General', detail: form.status },
    { href: '#cliente-contacto', label: 'Contacto', detail: form.email || form.phone ? 'Con datos' : 'Pendiente' },
    { href: '#cliente-personas', label: 'Personas', detail: `${form.contacts.length} contactos` },
    ...(selected ? [{ href: '#cliente-proyectos', label: 'Proyectos', detail: `${selectedProjects.length} asociados` }] : []),
  ]

  return (
    <aside className="w-full max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
      <div className="grid gap-4 border-b border-slate-200 bg-slate-950 px-5 py-5 text-white md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-blue-100">
              {selected ? 'Editar cliente' : 'Nuevo cliente'}
            </span>
            <ClientBadge status={form.status} />
          </div>
          <h2 className="mt-3 truncate text-2xl font-black">{form.name || 'Cliente sin nombre'}</h2>
          <p className="mt-1 text-sm text-slate-300">{form.taxId || form.industry || 'Completa los datos comerciales para identificar la cuenta.'}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {selected && (
            <button onClick={onDelete} className="inline-flex h-10 items-center gap-2 rounded-md border border-red-300/40 px-3 text-sm font-bold text-red-100 hover:bg-red-500/15">
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          )}
          <button onClick={onSave} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500">
            <Save className="h-4 w-4" />
            Guardar
          </button>
          <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-slate-200 hover:bg-white/10" aria-label="Cerrar modal de cliente">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid max-h-[calc(100vh-9rem)] overflow-hidden lg:grid-cols-[260px_1fr]">
        <nav className="border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {sectionLinks.map((section) => (
              <a key={section.href} href={section.href} className="group rounded-md border border-transparent px-3 py-2 text-sm transition hover:border-slate-200 hover:bg-white hover:shadow-sm">
                <span className="block font-bold text-slate-950">{section.label}</span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500 group-hover:text-blue-700">{section.detail}</span>
              </a>
            ))}
          </div>
          <div className="mt-4 hidden rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500 lg:block">
            <p className="font-bold uppercase tracking-wide text-slate-400">Resumen</p>
            <p className="mt-2 truncate font-semibold text-slate-700">{form.email || 'Sin correo general'}</p>
            <p className="mt-1 truncate">{form.phone || 'Sin telefono general'}</p>
            <p className="mt-3 font-semibold text-slate-700">{selectedProjects.length} proyectos asociados</p>
          </div>
        </nav>

        <div className="overflow-y-auto scroll-smooth">
          <div className="grid gap-8 p-5 text-sm">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                {error}
              </div>
            )}

            <section id="cliente-general" className="scroll-mt-4">
              <div className="mb-4 flex items-end justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Informacion general</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">Identificacion comercial</h3>
                </div>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ClientStatus })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
                  <option value="prospecto">Prospecto</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div className="grid gap-4">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Nombre del cliente</span>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre del cliente" className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">RUT / ID tributario</span>
                    <input value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value })} placeholder="76.000.000-0" className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Rubro</span>
                    <input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} placeholder="Naviera, puerto, acuicultura..." className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </label>
                </div>
              </div>
            </section>

            <section id="cliente-contacto" className="scroll-mt-4">
              <div className="mb-4 border-b border-slate-200 pb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Contacto principal</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">Canales y ubicacion</h3>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Correo general</span>
                    <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="contacto@empresa.cl" className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Telefono general</span>
                    <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+56 9 0000 0000" className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </label>
                </div>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Direccion</span>
                  <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Direccion comercial" className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Notas comerciales</span>
                  <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={4} placeholder="Condiciones, contexto de cuenta, acuerdos o informacion relevante." className="resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
              </div>
            </section>

            <section id="cliente-personas" className="scroll-mt-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Personas de contacto</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">Equipo relacionado</h3>
                </div>
                <button onClick={() => setForm({ ...form, contacts: [...form.contacts, emptyContact] })} className="inline-flex h-10 items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-800 hover:bg-blue-100">
                  <Plus className="h-4 w-4" />
                  Agregar contacto
                </button>
              </div>
              <div className="grid gap-3">
                {form.contacts.map((contact, index) => (
                  <div key={index} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-950">Contacto {index + 1}</p>
                      <button onClick={() => setForm({ ...form, contacts: form.contacts.filter((_, currentIndex) => currentIndex !== index) })} className="text-xs font-bold text-red-700 hover:text-red-800">
                        Quitar
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={contact.name} onChange={(event) => updateContact(index, { ...contact, name: event.target.value })} placeholder="Nombre" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <input value={contact.role} onChange={(event) => updateContact(index, { ...contact, role: event.target.value })} placeholder="Cargo" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={contact.email} onChange={(event) => updateContact(index, { ...contact, email: event.target.value })} placeholder="Correo" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <input value={contact.phone} onChange={(event) => updateContact(index, { ...contact, phone: event.target.value })} placeholder="Telefono" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                    </div>
                    <input value={contact.notes} onChange={(event) => updateContact(index, { ...contact, notes: event.target.value })} placeholder="Notas" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                ))}
                {!form.contacts.length && (
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                    Sin contactos registrados.
                  </div>
                )}
              </div>
            </section>

            {selected && (
              <section id="cliente-proyectos" className="scroll-mt-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Proyectos asociados</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">Historial operativo</h3>
                  </div>
                  <button onClick={onNewProject} className="inline-flex h-10 items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-800 hover:bg-blue-100">
                    <Plus className="h-4 w-4" />
                    Crear proyecto
                  </button>
                </div>
                <div className="grid gap-2">
                  {selectedProjects.map((project) => (
                    <button key={project._id} onClick={() => onSelectProject(project)} className="grid w-full gap-1 rounded-md border border-slate-200 px-3 py-3 text-left text-sm transition hover:border-blue-200 hover:bg-blue-50">
                      <span className="font-black text-slate-950">{project.name}</span>
                      <span className="text-xs font-semibold text-slate-500">{project.serviceType || 'Servicio sin clasificar'} · {project.status}</span>
                    </button>
                  ))}
                  {!selectedProjects.length && (
                    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                      Este cliente aun no tiene proyectos.
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
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
  const totalTasks = Object.values(taskTotals).reduce((total, value) => total + value, 0)
  const completedRate = totalTasks ? Math.round(taskTotals.completada / totalTasks * 100) : 0
  const openProjects = projects.filter((project) => ['prospecto', 'en_progreso', 'pausado'].includes(project.status))
  const margin = income - expenses
  const financeSeries = [
    { label: 'Ingresos', value: income, color: 'bg-emerald-500' },
    { label: 'Egresos', value: expenses, color: 'bg-rose-500' },
    { label: 'Margen', value: Math.max(margin, 0), color: 'bg-blue-500' },
  ]

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
            <div className="rounded-lg bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Resumen comercial</p>
              <h2 className="mt-2 max-w-xl text-2xl font-black leading-tight">Pipeline CRM listo para seguimiento</h2>
              <p className="mt-2 text-sm font-medium text-blue-50">Controla cartera, proyectos, margen y tareas sin salir del panel administrativo.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <HeroStat label="Clientes" value={clients.length} />
                <HeroStat label="Proyectos" value={projects.length} />
                <HeroStat label="Avance tareas" value={`${completedRate}%`} />
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Margen estimado</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{money(margin, currency)}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-md ${margin >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {margin >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                </div>
              </div>
              <MiniBars items={financeSeries} currency={currency} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Proyectos abiertos</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{openProjects.length}</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{projects.length} total</span>
          </div>
          <div className="mt-5 space-y-3">
            <TaskProgress label="Prospecto" value={projects.filter((project) => project.status === 'prospecto').length} total={projects.length} color="bg-blue-500" />
            <TaskProgress label="En progreso" value={projects.filter((project) => project.status === 'en_progreso').length} total={projects.length} color="bg-emerald-500" />
            <TaskProgress label="Pausado" value={projects.filter((project) => project.status === 'pausado').length} total={projects.length} color="bg-amber-500" />
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TaskKpi label="Pendientes" value={taskTotals.pendiente} tone="amber" icon={Clock3} total={totalTasks} />
        <TaskKpi label="En progreso" value={taskTotals.en_progreso} tone="blue" icon={Activity} total={totalTasks} />
        <TaskKpi label="Completadas" value={taskTotals.completada} tone="green" icon={CheckCircle2} total={totalTasks} />
        <TaskKpi label="Bloqueadas" value={taskTotals.bloqueada} tone="red" icon={AlertTriangle} total={totalTasks} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Cartera</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">Clientes recientes</h2>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{clients.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
                  <tr key={client._id} className="border-t border-slate-100 hover:bg-slate-50">
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
                      <button onClick={() => onSelectClient(client)} className="inline-flex items-center gap-1 rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">
                        Abrir
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
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

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Pipeline</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">Proyectos activos</h2>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{latestProjects.length} visibles</span>
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
              const taskCount = project.tasks?.length || 0
              const completedTasks = project.tasks?.filter((task) => task.status === 'completada').length || 0
              const taskRate = taskCount ? Math.round(completedTasks / taskCount * 100) : 0
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
                    <span>Tareas: <strong>{taskCount}</strong></span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${taskRate}%` }} />
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
  error,
  clients,
  selected,
  total,
  onSave,
  onDelete,
  onClose,
}: {
  form: ProjectForm
  setForm: (form: ProjectForm) => void
  error: string
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
  const projectCurrency = form.values[0]?.currency || 'CLP'
  const selectedClient = clients.find((client) => client._id === form.clientId)
  const sectionLinks = [
    { href: '#proyecto-general', label: 'General', detail: form.status },
    { href: '#proyecto-plazos', label: 'Plazos', detail: form.startDate || form.endDate ? 'Con fechas' : 'Pendiente' },
    { href: '#proyecto-valores', label: 'Valores', detail: `${form.values.length} registros` },
    { href: '#proyecto-tareas', label: 'Tareas', detail: `${form.tasks.length} tareas` },
  ]

  return (
    <aside className="w-full max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
      <div className="grid gap-4 border-b border-slate-200 bg-slate-950 px-5 py-5 text-white md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-blue-100">
              {selected ? 'Editar proyecto' : 'Nuevo proyecto'}
            </span>
            <ProjectBadge status={form.status} />
          </div>
          <h2 className="mt-3 truncate text-2xl font-black">{form.name || 'Proyecto sin nombre'}</h2>
          <p className="mt-1 text-sm text-slate-300">{selectedClient?.name || 'Selecciona un cliente para asociar el proyecto.'}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {selected && (
            <button onClick={onDelete} className="inline-flex h-10 items-center gap-2 rounded-md border border-red-300/40 px-3 text-sm font-bold text-red-100 hover:bg-red-500/15">
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          )}
          <button onClick={onSave} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500">
            <Save className="h-4 w-4" />
            Guardar
          </button>
          <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-slate-200 hover:bg-white/10" aria-label="Cerrar modal de proyecto">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid max-h-[calc(100vh-9rem)] overflow-hidden lg:grid-cols-[260px_1fr]">
        <nav className="border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {sectionLinks.map((section) => (
              <a key={section.href} href={section.href} className="group rounded-md border border-transparent px-3 py-2 text-sm transition hover:border-slate-200 hover:bg-white hover:shadow-sm">
                <span className="block font-bold text-slate-950">{section.label}</span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500 group-hover:text-blue-700">{section.detail}</span>
              </a>
            ))}
          </div>
          <div className="mt-4 hidden rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500 lg:block">
            <p className="font-bold uppercase tracking-wide text-slate-400">Resumen</p>
            <p className="mt-2 font-semibold text-slate-700">{money(total, projectCurrency)}</p>
            <p className="mt-1 truncate">{form.serviceType || 'Servicio sin clasificar'}</p>
            <p className="mt-3 font-semibold text-slate-700">{form.tasks.length} tareas · {form.values.length} valores</p>
          </div>
        </nav>

        <div className="overflow-y-auto scroll-smooth">
          <div className="grid gap-8 p-5 text-sm">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                {error}
              </div>
            )}

            <section id="proyecto-general" className="scroll-mt-4">
              <div className="mb-4 flex items-end justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Informacion general</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">Identificacion del proyecto</h3>
                </div>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
                  <option value="prospecto">Prospecto</option>
                  <option value="en_progreso">En progreso</option>
                  <option value="pausado">Pausado</option>
                  <option value="cerrado">Cerrado</option>
                  <option value="perdido">Perdido</option>
                </select>
              </div>
              <div className="grid gap-4">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Cliente asociado</span>
                  <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                    <option value="">Selecciona cliente</option>
                    {clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
                  </select>
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Nombre del proyecto</span>
                    <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre del proyecto" className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tipo de servicio</span>
                    <input value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })} placeholder="Tipo de servicio" className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </label>
                </div>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Descripcion / alcance</span>
                  <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} placeholder="Descripcion / alcance" className="resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
              </div>
            </section>

            <section id="proyecto-plazos" className="scroll-mt-4">
              <div className="mb-4 border-b border-slate-200 pb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Plazos</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">Fechas de gestion</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Inicio</span>
                  <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Termino</span>
                  <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
              </div>
            </section>

            <section id="proyecto-valores" className="scroll-mt-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Valores</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">Finanzas del proyecto</h3>
                </div>
                <button onClick={() => setForm({ ...form, values: [...form.values, emptyValue] })} className="inline-flex h-10 items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-800 hover:bg-blue-100">
                  <Plus className="h-4 w-4" />
                  Agregar valor
                </button>
              </div>
              <div className="grid gap-3">
                {form.values.map((value, index) => (
                  <div key={index} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-950">Valor {index + 1}</p>
                      <button onClick={() => setForm({ ...form, values: form.values.filter((_, currentIndex) => currentIndex !== index) })} className="text-xs font-bold text-red-700 hover:text-red-800">
                        Quitar
                      </button>
                    </div>
                    <input value={value.label} onChange={(event) => updateValue(index, { ...value, label: event.target.value })} placeholder="Concepto" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                    <div className="grid gap-3 md:grid-cols-4">
                      <input type="number" min={0} value={value.amount} onChange={(event) => updateValue(index, { ...value, amount: Number(event.target.value) })} placeholder="Monto" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <input value={value.currency} onChange={(event) => updateValue(index, { ...value, currency: event.target.value.toUpperCase() })} placeholder="CLP" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <select value={value.type} onChange={(event) => updateValue(index, { ...value, type: event.target.value as ValueType })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                        <option value="ingreso">Ingreso</option>
                        <option value="egreso">Egreso</option>
                      </select>
                      <input type="date" value={value.dueDate} onChange={(event) => updateValue(index, { ...value, dueDate: event.target.value })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                    </div>
                    <select value={value.status} onChange={(event) => updateValue(index, { ...value, status: event.target.value as ValueStatus })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                      <option value="pendiente">Pendiente</option>
                      <option value="facturado">Facturado</option>
                      <option value="pagado">Pagado</option>
                    </select>
                    <input value={value.notes} onChange={(event) => updateValue(index, { ...value, notes: event.target.value })} placeholder="Notas del valor" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                ))}
                {!form.values.length && (
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                    Sin valores registrados.
                  </div>
                )}
              </div>
            </section>

            <section id="proyecto-tareas" className="scroll-mt-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Tareas</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">Seguimiento operativo</h3>
                </div>
                <button onClick={() => setForm({ ...form, tasks: [...form.tasks, emptyTask] })} className="inline-flex h-10 items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-800 hover:bg-blue-100">
                  <Plus className="h-4 w-4" />
                  Agregar tarea
                </button>
              </div>
              <div className="grid gap-3">
                {form.tasks.map((task, index) => (
                  <div key={index} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-950">Tarea {index + 1}</p>
                      <button onClick={() => setForm({ ...form, tasks: form.tasks.filter((_, currentIndex) => currentIndex !== index) })} className="text-xs font-bold text-red-700 hover:text-red-800">
                        Quitar
                      </button>
                    </div>
                    <input value={task.title} onChange={(event) => updateTask(index, { ...task, title: event.target.value })} placeholder="Tarea" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                    <div className="grid gap-3 md:grid-cols-3">
                      <input value={task.owner} onChange={(event) => updateTask(index, { ...task, owner: event.target.value })} placeholder="Responsable" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <input type="date" value={task.dueDate} onChange={(event) => updateTask(index, { ...task, dueDate: event.target.value })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <select value={task.status} onChange={(event) => updateTask(index, { ...task, status: event.target.value as TaskStatus })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                        <option value="pendiente">Pendiente</option>
                        <option value="en_progreso">En progreso</option>
                        <option value="completada">Completada</option>
                        <option value="bloqueada">Bloqueada</option>
                      </select>
                    </div>
                    <input value={task.notes} onChange={(event) => updateTask(index, { ...task, notes: event.target.value })} placeholder="Notas de tarea" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                ))}
                {!form.tasks.length && (
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                    Sin tareas registradas.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </aside>
  )
}

const toneClasses = {
  blue: { card: 'border-blue-100 bg-blue-50 text-blue-900', icon: 'bg-blue-600 text-white', bar: 'bg-blue-500' },
  green: { card: 'border-emerald-100 bg-emerald-50 text-emerald-900', icon: 'bg-emerald-600 text-white', bar: 'bg-emerald-500' },
  violet: { card: 'border-violet-100 bg-violet-50 text-violet-900', icon: 'bg-violet-600 text-white', bar: 'bg-violet-500' },
  amber: { card: 'border-amber-100 bg-amber-50 text-amber-900', icon: 'bg-amber-500 text-white', bar: 'bg-amber-500' },
  red: { card: 'border-rose-100 bg-rose-50 text-rose-900', icon: 'bg-rose-600 text-white', bar: 'bg-rose-500' },
}

function Metric({ label, value, detail, tone, icon: Icon }: { label: string; value: number; detail: string; tone: keyof typeof toneClasses; icon: LucideIcon }) {
  const styles = toneClasses[tone]
  return (
    <div className={`rounded-lg border p-5 shadow-sm ${styles.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
          <p className="mt-1 text-xs font-semibold opacity-70">{detail}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-md ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-white/15 p-3 backdrop-blur">
      <p className="text-xs font-semibold text-blue-100">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  )
}

function MiniBars({ items, currency }: { items: Array<{ label: string; value: number; color: string }>; currency: string }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)
  return (
    <div className="mt-5 grid gap-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>{item.label}</span>
            <span>{money(item.value, currency)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-white">
            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max(8, item.value / maxValue * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function TaskProgress({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const rate = total ? Math.round(value / total * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="text-slate-500">{value} · {rate}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}

function TaskKpi({ label, value, tone, icon: Icon, total }: { label: string; value: number; tone: keyof typeof toneClasses; icon: LucideIcon; total: number }) {
  const styles = toneClasses[tone]
  const rate = total ? Math.round(value / total * 100) : 0
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${styles.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
          <p className="mt-2 text-2xl font-black">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-white/80">
        <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${rate}%` }} />
      </div>
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
