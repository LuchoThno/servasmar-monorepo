'use client'

import { FileText, Plus, Printer, Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useApiClient } from '@/lib/useApiClient'

type QuoteStatus = 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'vencida'

type Client = {
  _id: string
  name: string
  taxId?: string
  email?: string
  phone?: string
  address?: string
}

type Project = {
  _id: string
  clientId: string | Client
  name: string
  status: string
}

type QuoteItem = {
  description: string
  quantity: number
  unitPrice: number
  currency: string
}

type Quote = {
  _id: string
  number: string
  clientId: string | Client
  projectId?: string | Pick<Project, '_id' | 'name' | 'status'>
  title: string
  status: QuoteStatus
  issuedAt?: string
  validUntil?: string
  discountType: 'none' | 'amount' | 'percent'
  discountValue: number
  applyVat: boolean
  vatRate: number
  notes: string
  specialClauses: string
  items: QuoteItem[]
  updatedAt: string
}

type QuoteForm = {
  clientId: string
  projectId: string
  title: string
  status: QuoteStatus
  issuedAt: string
  validUntil: string
  discountType: 'none' | 'amount' | 'percent'
  discountValue: number
  applyVat: boolean
  vatRate: number
  notes: string
  specialClauses: string
  items: QuoteItem[]
}

const emptyItem: QuoteItem = { description: '', quantity: 1, unitPrice: 0, currency: 'CLP' }
const emptyQuote: QuoteForm = {
  clientId: '',
  projectId: '',
  title: '',
  status: 'borrador',
  issuedAt: new Date().toISOString().slice(0, 10),
  validUntil: '',
  discountType: 'none',
  discountValue: 0,
  applyVat: true,
  vatRate: 19,
  notes: '',
  specialClauses: '',
  items: [{ ...emptyItem }],
}

const toInputDate = (value?: string) => (value ? value.slice(0, 10) : '')
const clientName = (value: Quote['clientId']) => (typeof value === 'string' ? 'Cliente asociado' : value.name)
const projectName = (value?: Quote['projectId']) => (!value || typeof value === 'string' ? 'Sin proyecto' : value.name)
const projectClientId = (project: Project) => (typeof project.clientId === 'string' ? project.clientId : project.clientId._id)
const money = (amount: number, currency: string) => new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(amount || 0)
const quoteSubtotal = (items: QuoteItem[]) => items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
const quoteTotals = (quote: Pick<QuoteForm, 'items' | 'discountType' | 'discountValue' | 'applyVat' | 'vatRate'>) => {
  const subtotal = quoteSubtotal(quote.items)
  const discount = quote.discountType === 'percent'
    ? subtotal * Math.min(Number(quote.discountValue || 0), 100) / 100
    : quote.discountType === 'amount'
      ? Math.min(Number(quote.discountValue || 0), subtotal)
      : 0
  const net = Math.max(subtotal - discount, 0)
  const vat = quote.applyVat ? net * Number(quote.vatRate || 0) / 100 : 0
  return { subtotal, discount, net, vat, total: net + vat }
}
const quoteTotal = (quote: Pick<Quote, 'items' | 'discountType' | 'discountValue' | 'applyVat' | 'vatRate'>) => quoteTotals({
  items: quote.items,
  discountType: quote.discountType || 'none',
  discountValue: quote.discountValue || 0,
  applyVat: quote.applyVat ?? true,
  vatRate: quote.vatRate ?? 19,
}).total
const normalizeQuoteForm = (quote: QuoteForm): QuoteForm => ({
  ...quote,
  title: quote.title.trim(),
  notes: quote.notes.trim(),
  specialClauses: quote.specialClauses.trim(),
  items: quote.items
    .map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      currency: (item.currency || 'CLP').trim().toUpperCase(),
    }))
    .filter((item) => item.description || item.quantity || item.unitPrice),
})
const quoteFormError = (quote: QuoteForm) => {
  if (!quote.clientId) return 'Selecciona un cliente antes de guardar.'
  if (quote.title.trim().length < 2) return 'Ingresa un título de al menos 2 caracteres.'
  if (!quote.items.length) return 'Agrega al menos un ítem.'
  if (quote.items.some((item) => item.description.trim().length < 2)) return 'Cada ítem necesita una descripción de al menos 2 caracteres.'
  if (quote.items.some((item) => Number(item.quantity || 0) <= 0)) return 'Cada ítem debe tener una cantidad mayor a cero.'
  if (quote.items.some((item) => Number(item.unitPrice || 0) < 0)) return 'El precio unitario no puede ser negativo.'
  if (quote.discountType === 'percent' && Number(quote.discountValue || 0) > 100) return 'El descuento porcentual no puede superar el 100%.'
  if (quote.validUntil && quote.issuedAt && quote.validUntil < quote.issuedAt) return 'La fecha de validez no puede ser anterior a la fecha de emisión.'
  return ''
}

export default function AdminQuotesPage() {
  const { isLoaded, isSignedIn, requestJson } = useApiClient()
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState<QuoteForm>(emptyQuote)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filters, setFilters] = useState({ search: '', status: '', clientId: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadClients = useCallback(async () => {
    if (!isSignedIn) return
    const data = await requestJson<{ clients: Client[] }>('/api/crm/admin/clients')
    if (data) setClients(data.clients || [])
  }, [isSignedIn, requestJson])

  const loadProjects = useCallback(async () => {
    if (!isSignedIn) return
    const data = await requestJson<{ projects: Project[] }>('/api/crm/admin/projects')
    if (data) setProjects(data.projects || [])
  }, [isSignedIn, requestJson])

  const loadQuotes = useCallback(async () => {
    if (!isSignedIn) return
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    if (filters.clientId) params.set('clientId', filters.clientId)
    const data = await requestJson<{ quotes: Quote[] }>(`/api/crm/admin/quotes?${params.toString()}`)
    if (data) setQuotes(data.quotes || [])
  }, [filters.clientId, filters.search, filters.status, isSignedIn, requestJson])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    Promise.all([loadClients(), loadProjects(), loadQuotes()]).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, loadClients, loadProjects, loadQuotes])

  const refresh = async () => {
    await Promise.all([loadClients(), loadProjects(), loadQuotes()])
  }

  const availableProjects = useMemo(
    () => projects.filter((project) => !form.clientId || projectClientId(project) === form.clientId),
    [form.clientId, projects]
  )
  const formTotals = quoteTotals(form)
  const formCurrency = form.items[0]?.currency || 'CLP'
  const summary = useMemo(() => {
    const approved = quotes.filter((quote) => quote.status === 'aprobada')
    const sent = quotes.filter((quote) => quote.status === 'enviada')
    return {
      total: quotes.length,
      sent: sent.length,
      approved: approved.length,
      approvedAmount: approved.reduce((total, quote) => total + quoteTotal(quote), 0),
    }
  }, [quotes])

  const selectQuote = (quote: Quote) => {
    setSelectedId(quote._id)
    setForm({
      clientId: typeof quote.clientId === 'string' ? quote.clientId : quote.clientId._id,
      projectId: !quote.projectId || typeof quote.projectId === 'string' ? quote.projectId || '' : quote.projectId._id,
      title: quote.title,
      status: quote.status,
      issuedAt: toInputDate(quote.issuedAt) || new Date().toISOString().slice(0, 10),
      validUntil: toInputDate(quote.validUntil),
      discountType: quote.discountType || 'none',
      discountValue: quote.discountValue || 0,
      applyVat: quote.applyVat ?? true,
      vatRate: quote.vatRate ?? 19,
      notes: quote.notes || '',
      specialClauses: quote.specialClauses || '',
      items: quote.items?.length ? quote.items : [{ ...emptyItem }],
    })
    setMessage('')
    setIsModalOpen(true)
  }

  const newQuote = () => {
    setSelectedId('')
    setForm({ ...emptyQuote, issuedAt: new Date().toISOString().slice(0, 10), items: [{ ...emptyItem }] })
    setMessage('')
    setIsModalOpen(true)
  }

  const saveQuote = async () => {
    const normalizedForm = normalizeQuoteForm(form)
    const validationError = quoteFormError(normalizedForm)
    if (validationError) {
      setMessage(validationError)
      return
    }

    setIsSaving(true)
    try {
      const url = selectedId ? `/api/crm/admin/quotes/${selectedId}` : '/api/crm/admin/quotes'
      const method = selectedId ? 'PUT' : 'POST'
      const data = await requestJson<{ quote: Quote }>(url, { method, body: JSON.stringify(normalizedForm) })
      if (!data) return
      setSelectedId(data.quote._id)
      setForm(normalizedForm)
      setMessage('Cotización guardada.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar la cotización')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteQuote = async () => {
    if (!selectedId || isDeleting) return
    setIsDeleting(true)
    try {
      await requestJson(`/api/crm/admin/quotes/${selectedId}`, { method: 'DELETE' })
      newQuote()
      setIsModalOpen(false)
      setMessage('Cotización eliminada.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos eliminar la cotización')
    } finally {
      setIsDeleting(false)
    }
  }

  const openPdf = (quoteId = selectedId) => {
    if (!quoteId) {
      setMessage('Guarda o selecciona una cotización antes de emitir PDF.')
      return
    }
    window.open(`/admin/cotizaciones/${quoteId}/pdf`, '_blank')
  }

  const updateItem = (index: number, item: QuoteItem) => {
    setForm({ ...form, items: form.items.map((current, currentIndex) => currentIndex === index ? item : current) })
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">Cargando cotizaciones...</main>
  }

  return (
    <AdminShell title="Cotizaciones">
      <section className="mx-auto grid max-w-7xl gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Cotizaciones" value={summary.total} />
          <Metric label="Enviadas" value={summary.sent} />
          <Metric label="Aprobadas" value={summary.approved} />
          <div className="rounded-lg border border-green-200 bg-green-50 p-5 text-green-900">
            <p className="text-sm font-bold uppercase tracking-wide">Monto aprobado</p>
            <p className="mt-2 text-2xl font-black">{money(summary.approvedAmount, 'CLP')}</p>
          </div>
        </div>

        {message && <p className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">{message}</p>}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_160px_180px_auto]">
              <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Buscar folio, título o notas" className="h-11 rounded-md border border-slate-300 px-3 text-sm" />
              <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm">
                <option value="">Estados</option>
                <option value="borrador">Borrador</option>
                <option value="enviada">Enviada</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="vencida">Vencida</option>
              </select>
              <select value={filters.clientId} onChange={(event) => setFilters({ ...filters, clientId: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm">
                <option value="">Clientes</option>
                {clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
              </select>
              <button onClick={newQuote} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
                <Plus className="h-4 w-4" />
                Cotización
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Folio</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Proyecto</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => {
                    const currency = quote.items[0]?.currency || 'CLP'
                    return (
                      <tr key={quote._id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-950">{quote.number}</p>
                          <p className="text-slate-500">{quote.title}</p>
                        </td>
                        <td className="px-4 py-3">{clientName(quote.clientId)}</td>
                        <td className="px-4 py-3">{projectName(quote.projectId)}</td>
                        <td className="px-4 py-3"><QuoteBadge status={quote.status} /></td>
                        <td className="px-4 py-3 font-bold">{money(quoteTotal(quote), currency)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => selectQuote(quote)} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Editar</button>
                            <button onClick={() => openPdf(quote._id)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">PDF</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!quotes.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No hay cotizaciones con estos filtros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </section>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
            <aside className="flex max-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
              <div className="shrink-0 grid gap-4 border-b border-slate-200 bg-slate-950 px-5 py-5 text-white md:grid-cols-[1fr_auto] md:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-blue-100">
                      {selectedId ? 'Editar cotización' : 'Nueva cotización'}
                    </span>
                    <QuoteBadge status={form.status} />
                  </div>
                  <h2 className="mt-3 truncate text-2xl font-black">{form.title || 'Cotización sin título'}</h2>
                  <p className="mt-1 text-sm text-slate-300">Total: {money(formTotals.total, formCurrency)}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {selectedId && (
                    <button onClick={deleteQuote} disabled={isSaving || isDeleting} className="inline-flex h-10 items-center gap-2 rounded-md border border-red-300/40 px-3 text-sm font-bold text-red-100 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60">
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  )}
                  <button onClick={saveQuote} disabled={isSaving || isDeleting} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => openPdf()} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/15 px-4 text-sm font-bold text-slate-200 hover:bg-white/10">
                    <Printer className="h-4 w-4" />
                    PDF
                  </button>
                  <button onClick={() => setIsModalOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-slate-200 hover:bg-white/10" aria-label="Cerrar modal">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)] lg:grid-rows-none">
                <nav className="max-h-52 overflow-y-auto border-b border-slate-200 bg-slate-50 p-4 lg:max-h-none lg:border-b-0 lg:border-r">
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                    {[
                      ['#quote-general', 'General', form.status],
                      ['#quote-vigencia', 'Vigencia', form.validUntil || 'Pendiente'],
                      ['#quote-items', 'Ítems', `${form.items.length} registros`],
                      ['#quote-total', 'Totales', money(formTotals.total, formCurrency)],
                    ].map(([href, label, detail]) => (
                      <a key={href} href={href} className="group rounded-md border border-transparent px-3 py-2 text-sm transition hover:border-slate-200 hover:bg-white hover:shadow-sm">
                        <span className="block font-bold text-slate-950">{label}</span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500 group-hover:text-blue-700">{detail}</span>
                      </a>
                    ))}
                  </div>
                  <div className="mt-4 hidden rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500 lg:block">
                    <p className="font-bold uppercase tracking-wide text-slate-400">Resumen</p>
                    <p className="mt-2 font-semibold text-slate-700">{money(formTotals.net, formCurrency)} neto</p>
                    <p className="mt-1">IVA {form.applyVat ? `${form.vatRate}%` : 'no aplicado'}</p>
                    <p className="mt-3 text-base font-black text-slate-950">{money(formTotals.total, formCurrency)}</p>
                  </div>
                </nav>

                <div className="min-h-0 overflow-y-auto overscroll-contain scroll-smooth">
                  <div className="grid gap-8 p-5 text-sm">
                    <section id="quote-general" className="scroll-mt-4">
                      <div className="mb-4 flex items-end justify-between gap-3 border-b border-slate-200 pb-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Informacion general</p>
                          <h3 className="mt-1 text-lg font-black text-slate-950">Cliente y alcance</h3>
                        </div>
                        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as QuoteStatus })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
                          <option value="borrador">Borrador</option>
                          <option value="enviada">Enviada</option>
                          <option value="aprobada">Aprobada</option>
                          <option value="rechazada">Rechazada</option>
                          <option value="vencida">Vencida</option>
                        </select>
                      </div>
                      <div className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value, projectId: '' })} className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                            <option value="">Selecciona cliente</option>
                            {clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
                          </select>
                          <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                            <option value="">Sin proyecto asociado</option>
                            {availableProjects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
                          </select>
                        </div>
                        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Título de la cotización" className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      </div>
                    </section>

                    <section id="quote-vigencia" className="scroll-mt-4">
                      <div className="mb-4 border-b border-slate-200 pb-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Vigencia y condiciones</p>
                        <h3 className="mt-1 text-lg font-black text-slate-950">Fechas y clausulas</h3>
                      </div>
                      <div className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <input type="date" value={form.issuedAt} onChange={(event) => setForm({ ...form, issuedAt: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                          <input type="date" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                        </div>
                        <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} placeholder="Notas generales de la cotización" className="resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                        <textarea value={form.specialClauses} onChange={(event) => setForm({ ...form, specialClauses: event.target.value })} rows={4} placeholder="Cláusulas especiales, exclusiones, condiciones de pago o validez" className="resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      </div>
                    </section>

                    <section id="quote-items" className="scroll-mt-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Ítems</p>
                          <h3 className="mt-1 text-lg font-black text-slate-950">Detalle económico</h3>
                        </div>
                        <button onClick={() => setForm({ ...form, items: [...form.items, { ...emptyItem }] })} className="inline-flex h-10 items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-800 hover:bg-blue-100">
                          <Plus className="h-4 w-4" />
                          Agregar ítem
                        </button>
                      </div>
                      <div className="grid gap-3">
                        {form.items.map((item, index) => (
                          <div key={index} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-black text-slate-950">Ítem {index + 1}</p>
                              <button
                                onClick={() => setForm({ ...form, items: form.items.length > 1 ? form.items.filter((_, currentIndex) => currentIndex !== index) : [{ ...emptyItem }] })}
                                className="text-xs font-bold text-red-700 hover:text-red-800"
                              >
                                Quitar
                              </button>
                            </div>
                            <input value={item.description} onChange={(event) => updateItem(index, { ...item, description: event.target.value })} placeholder="Descripción" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                            <div className="grid gap-3 md:grid-cols-3">
                              <input type="number" min={0} value={item.quantity} onChange={(event) => updateItem(index, { ...item, quantity: Number(event.target.value) })} placeholder="Cantidad" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                              <input type="number" min={0} value={item.unitPrice} onChange={(event) => updateItem(index, { ...item, unitPrice: Number(event.target.value) })} placeholder="Precio unitario" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                              <input value={item.currency} onChange={(event) => updateItem(index, { ...item, currency: event.target.value.toUpperCase() })} placeholder="CLP" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                            </div>
                            <p className="text-right text-sm font-black text-slate-700">{money(item.quantity * item.unitPrice, item.currency || 'CLP')}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section id="quote-total" className="scroll-mt-4">
                      <div className="mb-4 border-b border-slate-200 pb-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Totales</p>
                        <h3 className="mt-1 text-lg font-black text-slate-950">Descuentos e impuestos</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value as QuoteForm['discountType'] })} className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                          <option value="none">Sin descuento</option>
                          <option value="amount">Descuento monto</option>
                          <option value="percent">Descuento %</option>
                        </select>
                        <input type="number" min={0} value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: Number(event.target.value) })} placeholder="Descuento manual" className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                        <label className="flex h-11 items-center gap-2 rounded-md border border-slate-300 px-3 font-semibold text-slate-700">
                          <input type="checkbox" checked={form.applyVat} onChange={(event) => setForm({ ...form, applyVat: event.target.checked })} />
                          Aplicar IVA
                        </label>
                      </div>
                      {form.applyVat && (
                        <input type="number" min={0} value={form.vatRate} onChange={(event) => setForm({ ...form, vatRate: Number(event.target.value) })} placeholder="IVA %" className="mt-4 h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      )}
                      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
                        <div className="flex justify-between"><span>Subtotal</span><strong>{money(formTotals.subtotal, formCurrency)}</strong></div>
                        <div className="mt-2 flex justify-between"><span>Descuento</span><strong>-{money(formTotals.discount, formCurrency)}</strong></div>
                        <div className="mt-2 flex justify-between"><span>Neto</span><strong>{money(formTotals.net, formCurrency)}</strong></div>
                        <div className="mt-2 flex justify-between"><span>IVA {form.applyVat ? `${form.vatRate}%` : 'no aplicado'}</span><strong>{money(formTotals.vat, formCurrency)}</strong></div>
                        <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base"><span>Total</span><strong>{money(formTotals.total, formCurrency)}</strong></div>
                      </div>
                    </section>
                  </div>
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

function QuoteBadge({ status }: { status: QuoteStatus }) {
  const classes = {
    borrador: 'bg-slate-100 text-slate-700',
    enviada: 'bg-blue-100 text-blue-800',
    aprobada: 'bg-green-100 text-green-800',
    rechazada: 'bg-red-100 text-red-800',
    vencida: 'bg-yellow-100 text-yellow-800',
  }
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${classes[status]}`}>{status}</span>
}
