'use client'

import { FileText, FolderOpen, Link2, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useApiClient } from '@/lib/useApiClient'

type ClientOption = { _id: string; name: string }
type ProjectOption = { _id: string; name: string; code?: string; clientId: string | { _id: string } }
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
  clientId?: { _id: string; name: string }
  projectId?: { _id: string; name: string; code?: string }
  invoiceId?: { _id: string; invoiceNumber: string }
  installmentId?: { _id: string; installmentNumber: number }
}

const entityLabels: Record<EntityType, string> = {
  client: 'Cliente',
  project: 'Proyecto',
  invoice: 'Factura',
  installment: 'Cuota',
}

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
  const [message, setMessage] = useState('')

  const loadAll = useCallback(async () => {
    const [documentsData, clientsData, projectsData, invoicesData, installmentsData] = await Promise.all([
      requestJson<{ documents: DocumentRecord[] }>('/api/documents/admin'),
      requestJson<{ clients: ClientOption[] }>('/api/crm/admin/clients'),
      requestJson<{ projects: ProjectOption[] }>('/api/crm/admin/projects'),
      requestJson<{ invoices: InvoiceOption[] }>('/api/finance/admin/invoices'),
      requestJson<{ installments: InstallmentOption[] }>('/api/finance/admin/installments'),
    ])

    setDocuments(documentsData?.documents || [])
    setClients(clientsData?.clients || [])
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

  const deleteDocument = async (id: string) => {
    try {
      await requestJson(`/api/documents/admin/${id}`, { method: 'DELETE' })
      await loadAll()
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
            <FolderOpen className="h-5 w-5 text-blue-700" />
            <div>
              <h2 className="text-lg font-bold text-slate-950">Subir documento a Google Drive</h2>
              <p className="text-sm text-slate-500">Crea o reutiliza carpetas por cliente y proyecto, y guarda `fileId` con enlace en MongoDB.</p>
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
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Cliente
              <select value={clientId} onChange={(event) => { setClientId(event.target.value); setProjectId(''); setInvoiceId(''); setInstallmentId('') }} className="rounded-2xl border border-slate-200 px-4 py-3">
                <option value="">Selecciona cliente</option>
                {clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
              </select>
            </label>

            {(entityType === 'project' || entityType === 'invoice' || entityType === 'installment') && (
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Proyecto
                <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setInvoiceId(''); setInstallmentId('') }} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="">Selecciona proyecto</option>
                  {filteredProjects.map((project) => <option key={project._id} value={project._id}>{project.code ? `${project.code} · ` : ''}{project.name}</option>)}
                </select>
              </label>
            )}

            {(entityType === 'invoice' || entityType === 'installment') && (
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Factura
                <select value={invoiceId} onChange={(event) => { setInvoiceId(event.target.value); setInstallmentId('') }} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="">Selecciona factura</option>
                  {filteredInvoices.map((invoice) => <option key={invoice._id} value={invoice._id}>{invoice.invoiceNumber}</option>)}
                </select>
              </label>
            )}

            {entityType === 'installment' && (
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Cuota
                <select value={installmentId} onChange={(event) => setInstallmentId(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="">Selecciona cuota</option>
                  {filteredInstallments.map((installment) => <option key={installment._id} value={installment._id}>Cuota {installment.installmentNumber}</option>)}
                </select>
              </label>
            )}

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Categoria
              <input value={category} onChange={(event) => setCategory(event.target.value.toUpperCase())} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="CONTRATOS / FACTURAS / INFORMES" />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Archivo
              <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <button type="button" onClick={uploadDocument} disabled={uploading} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
              <Upload className="h-4 w-4" />
              {uploading ? 'Subiendo...' : 'Subir documento'}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-800" />
            <div>
              <h2 className="text-lg font-bold text-slate-950">Documentos registrados</h2>
              <p className="text-sm text-slate-500">Listado centralizado con descarga y enlace a Drive.</p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Archivo</th>
                  <th className="pb-3 pr-4">Asociado a</th>
                  <th className="pb-3 pr-4">Categoria</th>
                  <th className="pb-3 pr-4">Subido por</th>
                  <th className="pb-3 pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document._id} className="border-t border-slate-100">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900">{document.name}</p>
                      <p className="text-xs text-slate-500">{document.createdAt.slice(0, 10)} · {entityLabels[document.entityType]}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {document.installmentId ? `Cuota ${document.installmentId.installmentNumber}` :
                        document.invoiceId ? `Factura ${document.invoiceId.invoiceNumber}` :
                        document.projectId ? `${document.projectId.code ? `${document.projectId.code} · ` : ''}${document.projectId.name}` :
                        document.clientId?.name || '-'}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{document.category}</td>
                    <td className="py-3 pr-4 text-slate-700">{document.uploadedBy || '-'}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-3">
                        <a href={`${document.downloadUrl}?download=1`} className="text-xs font-bold text-blue-700">Descargar</a>
                        {document.webViewLink && (
                          <a href={document.webViewLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <Link2 className="h-3.5 w-3.5" />
                            Drive
                          </a>
                        )}
                        <button type="button" onClick={() => deleteDocument(document._id)} className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!documents.length && !loading && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">Aun no hay documentos registrados.</td>
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
