'use client'

import { Eye, FilePenLine, FileText, FolderOpen, Link2, PencilLine, Trash2, Upload, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useApiClient } from '@/lib/useApiClient'

type ClientOption = {
  _id: string
  name: string
  email?: string
  phone?: string
  driveFolderId?: string
  contacts?: Array<{ name: string; email?: string; phone?: string }>
}

type ProjectTaskAttachment = {
  name: string
  url?: string
  webViewLink?: string
  driveFileId?: string
  uploadedAt?: string
  uploadedBy?: string
}

type ProjectTask = {
  _id?: string
  title: string
  attachments?: ProjectTaskAttachment[]
}

type ProjectOption = {
  _id: string
  name: string
  code?: string
  driveFolderId?: string
  serviceType?: string
  clientId: string | { _id: string; name?: string }
  tasks?: ProjectTask[]
}

type InvoiceOption = { _id: string; invoiceNumber: string; clientId: ClientOption; projectId: { _id: string; name: string } }
type InstallmentOption = { _id: string; installmentNumber: number; invoiceId: { _id: string; invoiceNumber: string }; clientId: ClientOption; projectId: { _id: string; name: string } }
type EntityType = 'client' | 'project' | 'invoice' | 'installment'

type DocumentRecord = {
  _id: string
  name: string
  category: string
  entityType: EntityType
  webViewLink: string
  downloadUrl: string
  uploadedBy: string
  createdAt: string
  driveFolderId?: string
  mimeType?: string
  sizeBytes?: number
  clientId?: { _id: string; name: string }
  projectId?: { _id: string; name: string; code?: string }
  invoiceId?: { _id: string; invoiceNumber: string }
  installmentId?: { _id: string; installmentNumber: number }
}

type EditDocumentForm = {
  id: string
  name: string
  category: string
  entityType: EntityType
  clientId: string
  projectId: string
  invoiceId: string
  installmentId: string
}

const entityLabels: Record<EntityType, string> = {
  client: 'Cliente',
  project: 'Proyecto',
  invoice: 'Factura',
  installment: 'Cuota',
}

const driveFolderUrl = (folderId?: string) => (folderId ? `https://drive.google.com/drive/folders/${folderId}` : '')

export default function AdminDocumentsPage() {
  const { authorizedFetch, isLoaded, isSignedIn, requestJson } = useApiClient()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [invoices, setInvoices] = useState<InvoiceOption[]>([])
  const [installments, setInstallments] = useState<InstallmentOption[]>([])
  const [entityType, setEntityType] = useState<EntityType>('project')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [installmentId, setInstallmentId] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [editingDocument, setEditingDocument] = useState<EditDocumentForm | null>(null)

  const loadAll = useCallback(async () => {
    const [documentsData, clientsData, projectsData, invoicesData, installmentsData] = await Promise.all([
      requestJson<{ documents: DocumentRecord[] }>('/api/documents/admin'),
      requestJson<{ clients: ClientOption[] }>('/api/crm/admin/clients'),
      requestJson<{ projects: ProjectOption[] }>('/api/crm/admin/projects'),
      requestJson<{ invoices: InvoiceOption[] }>('/api/finance/admin/invoices'),
      requestJson<{ installments: InstallmentOption[] }>('/api/finance/admin/installments'),
    ])

    setDocuments(documentsData?.documents || [])
    setClients((clientsData?.clients || []) as ClientOption[])
    setProjects((projectsData?.projects || []) as ProjectOption[])
    setInvoices((invoicesData?.invoices || []) as InvoiceOption[])
    setInstallments((installmentsData?.installments || []) as InstallmentOption[])
  }, [requestJson])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    loadAll()
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No pudimos cargar los documentos'))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, loadAll])

  const filteredProjects = useMemo(
    () => projects.filter((project) => !clientId || (typeof project.clientId === 'string' ? project.clientId : project.clientId._id) === clientId),
    [clientId, projects]
  )

  const filteredInvoices = useMemo(
    () => invoices.filter((invoice) => (!clientId || invoice.clientId?._id === clientId) && (!projectId || invoice.projectId?._id === projectId)),
    [clientId, invoices, projectId]
  )

  const filteredInstallments = useMemo(
    () => installments.filter((installment) => (!clientId || installment.clientId?._id === clientId) && (!projectId || installment.projectId?._id === projectId) && (!invoiceId || installment.invoiceId?._id === invoiceId)),
    [clientId, installments, invoiceId, projectId]
  )

  const selectedClient = useMemo(
    () => clients.find((client) => client._id === clientId),
    [clientId, clients]
  )

  const selectedProject = useMemo(
    () => projects.find((project) => project._id === projectId),
    [projectId, projects]
  )

  const projectAttachments = useMemo(() => {
    if (!selectedProject?.tasks?.length) return []
    return selectedProject.tasks.flatMap((task) =>
      (task.attachments || []).map((attachment) => ({
        ...attachment,
        taskTitle: task.title,
      }))
    )
  }, [selectedProject])

  const displayedDocuments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return documents.filter((document) => {
      if (clientId && document.clientId?._id !== clientId) return false
      if (projectId && document.projectId?._id !== projectId) return false
      if (invoiceId && document.invoiceId?._id !== invoiceId) return false
      if (installmentId && document.installmentId?._id !== installmentId) return false
      if (!query) return true
      return [
        document.name,
        document.category,
        document.clientId?.name,
        document.projectId?.name,
        document.projectId?.code,
        document.invoiceId?.invoiceNumber,
      ].some((value) => (value || '').toLowerCase().includes(query))
    })
  }, [clientId, documents, installmentId, invoiceId, projectId, search])

  const resetSelectors = (type: EntityType) => {
    setEntityType(type)
    setClientId('')
    setProjectId('')
    setInvoiceId('')
    setInstallmentId('')
  }

  const uploadDocument = async () => {
    if (!file) {
      setMessage('Selecciona un archivo primero.')
      return
    }

    if (entityType === 'client' && !clientId) return setMessage('Selecciona un cliente.')
    if (entityType === 'project' && !projectId) return setMessage('Selecciona un proyecto.')
    if (entityType === 'invoice' && !invoiceId) return setMessage('Selecciona una factura.')
    if (entityType === 'installment' && !installmentId) return setMessage('Selecciona una cuota.')

    const formData = new FormData()
    formData.set('entityType', entityType)
    formData.set('category', category)
    formData.set('file', file)
    if (clientId) formData.set('clientId', clientId)
    if (projectId) formData.set('projectId', projectId)
    if (invoiceId) formData.set('invoiceId', invoiceId)
    if (installmentId) formData.set('installmentId', installmentId)

    setUploading(true)
    setMessage('')
    try {
      const response = await authorizedFetch('/api/documents/admin', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message || 'No pudimos subir el documento')
      setFile(null)
      setCategory('GENERAL')
      await loadAll()
      setMessage('Documento subido y asociado correctamente.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos subir el documento')
    } finally {
      setUploading(false)
    }
  }

  const startEditingDocument = (document: DocumentRecord) => {
    setEditingDocument({
      id: document._id,
      name: document.name,
      category: document.category,
      entityType: document.entityType,
      clientId: document.clientId?._id || '',
      projectId: document.projectId?._id || '',
      invoiceId: document.invoiceId?._id || '',
      installmentId: document.installmentId?._id || '',
    })
    setMessage('')
  }

  const saveDocumentMeta = async () => {
    if (!editingDocument) return
    setSavingMeta(true)
    setMessage('')
    try {
      await requestJson(`/api/documents/admin/${editingDocument.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editingDocument),
      })
      await loadAll()
      setEditingDocument(null)
      setMessage('Información del documento actualizada.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos actualizar el documento')
    } finally {
      setSavingMeta(false)
    }
  }

  const deleteDocument = async (id: string) => {
    try {
      await requestJson(`/api/documents/admin/${id}`, { method: 'DELETE' })
      await loadAll()
      if (editingDocument?.id === id) setEditingDocument(null)
      setMessage('Documento eliminado.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos eliminar el documento')
    }
  }

  return (
    <AdminShell title="Documentos">
      <div className="grid gap-6">
        {message && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">{message}</div>}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-blue-700" />
            <div>
              <h2 className="text-lg font-bold text-slate-950">Explorador documental</h2>
              <p className="text-sm text-slate-500">Revisa cliente, proyecto, carpetas de Drive y adjuntos que ya viven dentro del módulo de proyectos.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Cliente">
              <select value={clientId} onChange={(event) => { setClientId(event.target.value); setProjectId(''); setInvoiceId(''); setInstallmentId('') }} className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="">Todos los clientes</option>
                {clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
              </select>
            </SelectField>

            <SelectField label="Proyecto">
              <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setInvoiceId(''); setInstallmentId('') }} className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="">Todos los proyectos</option>
                {filteredProjects.map((project) => <option key={project._id} value={project._id}>{project.code ? `${project.code} · ` : ''}{project.name}</option>)}
              </select>
            </SelectField>

            <SelectField label="Factura">
              <select value={invoiceId} onChange={(event) => { setInvoiceId(event.target.value); setInstallmentId('') }} className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="">Todas las facturas</option>
                {filteredInvoices.map((invoice) => <option key={invoice._id} value={invoice._id}>{invoice.invoiceNumber}</option>)}
              </select>
            </SelectField>

            <SelectField label="Busqueda">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Archivo, categoria o proyecto" />
            </SelectField>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Cliente visible</h3>
              </div>
              {selectedClient ? (
                <div className="mt-4 grid gap-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-950">{selectedClient.name}</p>
                  <p>{selectedClient.email || 'Sin correo principal'}{selectedClient.phone ? ` · ${selectedClient.phone}` : ''}</p>
                  <p>{selectedClient.contacts?.length || 0} contactos registrados</p>
                  {selectedClient.driveFolderId ? (
                    <a href={driveFolderUrl(selectedClient.driveFolderId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                      <FolderOpen className="h-4 w-4" />
                      Abrir carpeta del cliente en Drive
                    </a>
                  ) : (
                    <p className="text-slate-500">El cliente aun no tiene carpeta Drive visible.</p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Selecciona un cliente para revisar su carpeta y documentos relacionados.</p>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Proyecto y adjuntos</h3>
              </div>
              {selectedProject ? (
                <div className="mt-4 grid gap-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-950">{selectedProject.code ? `${selectedProject.code} · ` : ''}{selectedProject.name}</p>
                  <p>{selectedProject.serviceType || 'Sin tipo de servicio definido'}</p>
                  {selectedProject.driveFolderId ? (
                    <a href={driveFolderUrl(selectedProject.driveFolderId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                      <FolderOpen className="h-4 w-4" />
                      Abrir carpeta del proyecto en Drive
                    </a>
                  ) : (
                    <p className="text-slate-500">El proyecto aun no tiene carpeta Drive visible.</p>
                  )}
                  <p>{projectAttachments.length} adjuntos detectados dentro de tareas del proyecto</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Selecciona un proyecto para ver su carpeta y los documentos subidos desde tareas.</p>
              )}
            </article>
          </div>

          {selectedProject && (
            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Adjuntos encontrados en tareas del proyecto</h3>
              <div className="mt-4 grid gap-3">
                {projectAttachments.map((attachment, index) => (
                  <div key={`${attachment.driveFileId || attachment.name}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{attachment.name}</p>
                      <p className="text-xs text-slate-500">Tarea: {attachment.taskTitle}{attachment.uploadedBy ? ` · ${attachment.uploadedBy}` : ''}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {attachment.url && attachment.url !== '#' ? <a href={attachment.url} className="text-xs font-bold text-blue-700">Descargar</a> : null}
                      {attachment.webViewLink ? <a href={attachment.webViewLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700">Drive</a> : null}
                    </div>
                  </div>
                ))}
                {!projectAttachments.length && <p className="text-sm text-slate-500">Este proyecto aun no tiene adjuntos registrados dentro de tareas.</p>}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-blue-700" />
            <div>
              <h2 className="text-lg font-bold text-slate-950">Subir documento a Google Drive</h2>
              <p className="text-sm text-slate-500">Asocia documentos a cliente, proyecto, factura o cuota usando la estructura ya creada en Drive.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(['client', 'project', 'invoice', 'installment'] as EntityType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => resetSelectors(type)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${entityType === type ? 'bg-slate-950 text-white' : 'border border-slate-200 text-slate-700'}`}
              >
                {entityLabels[type]}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Cliente">
              <select value={clientId} onChange={(event) => { setClientId(event.target.value); setProjectId(''); setInvoiceId(''); setInstallmentId('') }} className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="">Selecciona cliente</option>
                {clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
              </select>
            </SelectField>

            {(entityType === 'project' || entityType === 'invoice' || entityType === 'installment') && (
              <SelectField label="Proyecto">
                <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setInvoiceId(''); setInstallmentId('') }} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="">Selecciona proyecto</option>
                  {filteredProjects.map((project) => <option key={project._id} value={project._id}>{project.code ? `${project.code} · ` : ''}{project.name}</option>)}
                </select>
              </SelectField>
            )}

            {(entityType === 'invoice' || entityType === 'installment') && (
              <SelectField label="Factura">
                <select value={invoiceId} onChange={(event) => { setInvoiceId(event.target.value); setInstallmentId('') }} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="">Selecciona factura</option>
                  {filteredInvoices.map((invoice) => <option key={invoice._id} value={invoice._id}>{invoice.invoiceNumber}</option>)}
                </select>
              </SelectField>
            )}

            {entityType === 'installment' && (
              <SelectField label="Cuota">
                <select value={installmentId} onChange={(event) => setInstallmentId(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="">Selecciona cuota</option>
                  {filteredInstallments.map((installment) => <option key={installment._id} value={installment._id}>Cuota {installment.installmentNumber}</option>)}
                </select>
              </SelectField>
            )}

            <SelectField label="Categoria">
              <input value={category} onChange={(event) => setCategory(event.target.value.toUpperCase())} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="CONTRATOS / INFORMES / FACTURAS" />
            </SelectField>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <SelectField label="Archivo">
              <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded-2xl border border-slate-200 px-4 py-3" />
            </SelectField>
            <button type="button" onClick={uploadDocument} disabled={uploading} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
              <Upload className="h-4 w-4" />
              {uploading ? 'Subiendo...' : 'Subir documento'}
            </button>
          </div>
        </section>

        {editingDocument && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <FilePenLine className="h-5 w-5 text-blue-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Editar información del documento</h2>
                <p className="text-sm text-slate-500">Actualiza metadata y relación operativa en Mongo sin tocar el archivo en Drive.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField label="Nombre visible">
                <input value={editingDocument.name} onChange={(event) => setEditingDocument((current) => current ? { ...current, name: event.target.value } : current)} className="rounded-2xl border border-slate-200 px-4 py-3" />
              </SelectField>
              <SelectField label="Categoria">
                <input value={editingDocument.category} onChange={(event) => setEditingDocument((current) => current ? { ...current, category: event.target.value.toUpperCase() } : current)} className="rounded-2xl border border-slate-200 px-4 py-3" />
              </SelectField>
              <SelectField label="Tipo de entidad">
                <select value={editingDocument.entityType} onChange={(event) => setEditingDocument((current) => current ? { ...current, entityType: event.target.value as EntityType, clientId: '', projectId: '', invoiceId: '', installmentId: '' } : current)} className="rounded-2xl border border-slate-200 px-4 py-3">
                  {(['client', 'project', 'invoice', 'installment'] as EntityType[]).map((type) => <option key={type} value={type}>{entityLabels[type]}</option>)}
                </select>
              </SelectField>
              <SelectField label="Cliente">
                <select value={editingDocument.clientId} onChange={(event) => setEditingDocument((current) => current ? { ...current, clientId: event.target.value, projectId: '', invoiceId: '', installmentId: '' } : current)} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="">Selecciona cliente</option>
                  {clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
                </select>
              </SelectField>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(editingDocument.entityType === 'project' || editingDocument.entityType === 'invoice' || editingDocument.entityType === 'installment') && (
                <SelectField label="Proyecto">
                  <select value={editingDocument.projectId} onChange={(event) => setEditingDocument((current) => current ? { ...current, projectId: event.target.value, invoiceId: '', installmentId: '' } : current)} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <option value="">Selecciona proyecto</option>
                    {projects
                      .filter((project) => !editingDocument.clientId || (typeof project.clientId === 'string' ? project.clientId : project.clientId._id) === editingDocument.clientId)
                      .map((project) => <option key={project._id} value={project._id}>{project.code ? `${project.code} · ` : ''}{project.name}</option>)}
                  </select>
                </SelectField>
              )}

              {(editingDocument.entityType === 'invoice' || editingDocument.entityType === 'installment') && (
                <SelectField label="Factura">
                  <select value={editingDocument.invoiceId} onChange={(event) => setEditingDocument((current) => current ? { ...current, invoiceId: event.target.value, installmentId: '' } : current)} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <option value="">Selecciona factura</option>
                    {invoices
                      .filter((invoice) => (!editingDocument.clientId || invoice.clientId?._id === editingDocument.clientId) && (!editingDocument.projectId || invoice.projectId?._id === editingDocument.projectId))
                      .map((invoice) => <option key={invoice._id} value={invoice._id}>{invoice.invoiceNumber}</option>)}
                  </select>
                </SelectField>
              )}

              {editingDocument.entityType === 'installment' && (
                <SelectField label="Cuota">
                  <select value={editingDocument.installmentId} onChange={(event) => setEditingDocument((current) => current ? { ...current, installmentId: event.target.value } : current)} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <option value="">Selecciona cuota</option>
                    {installments
                      .filter((installment) => (!editingDocument.clientId || installment.clientId?._id === editingDocument.clientId) && (!editingDocument.projectId || installment.projectId?._id === editingDocument.projectId) && (!editingDocument.invoiceId || installment.invoiceId?._id === editingDocument.invoiceId))
                      .map((installment) => <option key={installment._id} value={installment._id}>Cuota {installment.installmentNumber}</option>)}
                  </select>
                </SelectField>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={saveDocumentMeta} disabled={savingMeta} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                <PencilLine className="h-4 w-4" />
                {savingMeta ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setEditingDocument(null)} className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
                Cancelar
              </button>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-800" />
            <div>
              <h2 className="text-lg font-bold text-slate-950">Documentos registrados</h2>
              <p className="text-sm text-slate-500">Listado centralizado con descarga, enlace a Drive y edición de metadata.</p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Archivo</th>
                  <th className="pb-3 pr-4">Cliente / Proyecto</th>
                  <th className="pb-3 pr-4">Categoria</th>
                  <th className="pb-3 pr-4">Subido por</th>
                  <th className="pb-3 pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayedDocuments.map((document) => (
                  <tr key={document._id} className="border-t border-slate-100">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900">{document.name}</p>
                      <p className="text-xs text-slate-500">{document.createdAt.slice(0, 10)} · {entityLabels[document.entityType]}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      <p>{document.clientId?.name || '-'}</p>
                      <p className="text-xs text-slate-500">
                        {document.installmentId ? `Cuota ${document.installmentId.installmentNumber}` :
                          document.invoiceId ? `Factura ${document.invoiceId.invoiceNumber}` :
                          document.projectId ? `${document.projectId.code ? `${document.projectId.code} · ` : ''}${document.projectId.name}` :
                          'Sin proyecto asociado'}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{document.category}</td>
                    <td className="py-3 pr-4 text-slate-700">{document.uploadedBy || '-'}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => startEditingDocument(document)} className="text-xs font-bold text-slate-700">Editar</button>
                        <a href={`${document.downloadUrl}?download=1`} className="text-xs font-bold text-blue-700">Descargar</a>
                        {document.webViewLink && (
                          <a href={document.webViewLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <Link2 className="h-3.5 w-3.5" />
                            Drive
                          </a>
                        )}
                        {document.driveFolderId ? (
                          <a href={driveFolderUrl(document.driveFolderId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700">
                            <FolderOpen className="h-3.5 w-3.5" />
                            Carpeta
                          </a>
                        ) : null}
                        <button type="button" onClick={() => deleteDocument(document._id)} className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!displayedDocuments.length && !loading && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">Aun no hay documentos registrados para estos filtros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  )
}

function SelectField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  )
}
