'use client'

import { AlertTriangle, BellRing, Clock3, Mail, Phone, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useApiClient } from '@/lib/useApiClient'

type OverdueInvoice = {
  _id: string
  invoiceNumber: string
  dueDate: string
  totalAmount: number
  daysOverdue: number
  status: 'pendiente' | 'pagada' | 'vencida' | 'anulada'
  updatedAt?: string
  updatedBy?: string
  clientId: { _id: string; name: string; email?: string; taxId?: string }
  projectId: { _id: string; name: string; code?: string }
}

type OverdueInstallment = {
  _id: string
  installmentNumber: number
  amount: number
  dueDate: string
  status: 'pendiente' | 'pagada' | 'pago_parcial' | 'vencida' | 'anulada'
  updatedAt?: string
  updatedBy?: string
  clientId: { _id: string; name: string; email?: string; taxId?: string }
  projectId: { _id: string; name: string; code?: string }
  invoiceId: { _id: string; invoiceNumber: string; totalAmount: number }
}

type PendingAction = {
  _id: string
  entityType: 'invoice' | 'installment'
  actionType: 'note' | 'call' | 'email' | 'promise' | 'warning' | 'payment' | 'status_change'
  title: string
  description: string
  dueDate?: string
  status: 'active' | 'resolved'
  createdBy: string
  createdAt: string
  clientId?: { _id: string; name: string }
  projectId?: { _id: string; name: string; code?: string }
  invoiceId?: { _id: string; invoiceNumber: string }
  installmentId?: { _id: string; installmentNumber: number }
}

type AlertSummary = {
  overdueInvoices: number
  overdueInstallments: number
  severeInvoices: number
  pendingActions: number
}

type CollectionForm = {
  entityType: 'invoice' | 'installment'
  entityId: string
  clientId: string
  projectId: string
  invoiceId: string
  installmentId: string
  actionType: PendingAction['actionType']
  title: string
  description: string
  dueDate: string
  status: 'active' | 'resolved'
}

const money = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount || 0)
const dateValue = (value?: string) => (value ? value.slice(0, 10) : '')
const today = new Date().toISOString().slice(0, 10)
const formatAuditMeta = (updatedBy?: string, updatedAt?: string) => {
  if (!updatedBy && !updatedAt) return ''
  const pieces = ['Ultimo cambio:']
  if (updatedBy) pieces.push(updatedBy)
  if (updatedAt) pieces.push(dateValue(updatedAt))
  return pieces.join(' · ')
}

const emptyForm: CollectionForm = {
  entityType: 'invoice',
  entityId: '',
  clientId: '',
  projectId: '',
  invoiceId: '',
  installmentId: '',
  actionType: 'call',
  title: '',
  description: '',
  dueDate: today,
  status: 'active',
}

export default function AdminCollectionsPage() {
  const { isLoaded, isSignedIn, requestJson } = useApiClient()
  const [summary, setSummary] = useState<AlertSummary>({ overdueInvoices: 0, overdueInstallments: 0, severeInvoices: 0, pendingActions: 0 })
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([])
  const [overdueInstallments, setOverdueInstallments] = useState<OverdueInstallment[]>([])
  const [actions, setActions] = useState<PendingAction[]>([])
  const [form, setForm] = useState<CollectionForm>(emptyForm)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusSavingKey, setStatusSavingKey] = useState('')
  const [invoiceStatusDrafts, setInvoiceStatusDrafts] = useState<Record<string, OverdueInvoice['status']>>({})
  const [installmentStatusDrafts, setInstallmentStatusDrafts] = useState<Record<string, OverdueInstallment['status']>>({})

  const loadAll = useCallback(async () => {
    const data = await requestJson<{
      alertSummary: AlertSummary
      overdueInvoices: OverdueInvoice[]
      overdueInstallments: OverdueInstallment[]
      pendingActions: PendingAction[]
    }>('/api/finance/admin/collections/summary')

    setSummary(data?.alertSummary || { overdueInvoices: 0, overdueInstallments: 0, severeInvoices: 0, pendingActions: 0 })
    setOverdueInvoices(data?.overdueInvoices || [])
    setOverdueInstallments(data?.overdueInstallments || [])
    setActions(data?.pendingActions || [])
  }, [requestJson])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    loadAll()
      .catch((error) => setMessage(error instanceof Error ? error.message : 'No pudimos cargar la cobranza'))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, loadAll])

  const prioritizedInvoices = useMemo(
    () => [...overdueInvoices].sort((a, b) => b.daysOverdue - a.daysOverdue),
    [overdueInvoices]
  )

  const prefillInvoiceAction = (invoice: OverdueInvoice) => {
    setForm({
      entityType: 'invoice',
      entityId: invoice._id,
      clientId: invoice.clientId._id,
      projectId: invoice.projectId._id,
      invoiceId: invoice._id,
      installmentId: '',
      actionType: 'call',
      title: `Seguimiento factura ${invoice.invoiceNumber}`,
      description: '',
      dueDate: today,
      status: 'active',
    })
  }

  const prefillInstallmentAction = (installment: OverdueInstallment) => {
    setForm({
      entityType: 'installment',
      entityId: installment._id,
      clientId: installment.clientId._id,
      projectId: installment.projectId._id,
      invoiceId: installment.invoiceId._id,
      installmentId: installment._id,
      actionType: 'call',
      title: `Seguimiento cuota ${installment.installmentNumber}`,
      description: '',
      dueDate: today,
      status: 'active',
    })
  }

  const saveAction = async () => {
    if (!form.entityId || !form.title.trim()) {
      setMessage('Selecciona una factura o cuota vencida y agrega un título para la gestión.')
      return
    }

    setSaving(true)
    setMessage('')
    try {
      await requestJson('/api/finance/admin/collections/actions', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setForm(emptyForm)
      await loadAll()
      setMessage('Gestión de cobranza registrada.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos registrar la gestión')
    } finally {
      setSaving(false)
    }
  }

  const resolveAction = async (id: string) => {
    try {
      await requestJson(`/api/finance/admin/collections/actions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      })
      await loadAll()
      setMessage('Gestión marcada como resuelta.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos actualizar la gestión')
    }
  }

  const createCalendarReminder = async (entityType: 'invoice' | 'installment', entityId: string) => {
    try {
      await requestJson('/api/finance/admin/calendar/reminders', {
        method: 'POST',
        body: JSON.stringify({ entityType, entityId }),
      })
      setMessage('Recordatorio creado en Google Calendar.')
      await loadAll()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos crear el recordatorio en Calendar')
    }
  }

  const updateStatus = async (key: string, url: string, body: unknown, successMessage: string, cleanup?: () => void) => {
    try {
      setStatusSavingKey(key)
      await requestJson(url, { method: 'PATCH', body: JSON.stringify(body) })
      cleanup?.()
      await loadAll()
      setMessage(successMessage)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos actualizar el estado')
    } finally {
      setStatusSavingKey('')
    }
  }

  return (
    <AdminShell title="Cobranza">
      <div className="grid gap-6">
        {message && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">{message}</div>}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Facturas vencidas" value={String(summary.overdueInvoices)} icon={AlertTriangle} tone="bg-amber-500" />
          <KpiCard label="Cuotas vencidas" value={String(summary.overdueInstallments)} icon={Clock3} tone="bg-rose-600" />
          <KpiCard label="Casos severos +30 días" value={String(summary.severeInvoices)} icon={ShieldAlert} tone="bg-slate-950" />
          <KpiCard label="Gestiones pendientes" value={String(summary.pendingActions)} icon={BellRing} tone="bg-blue-600" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Facturas vencidas priorizadas</h2>
                <p className="text-sm text-slate-500">Semáforo por días de atraso para priorizar gestión.</p>
              </div>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4">Factura</th>
                    <th className="pb-3 pr-4">Cliente</th>
                    <th className="pb-3 pr-4">Atraso</th>
                    <th className="pb-3 pr-4">Monto</th>
                    <th className="pb-3 pr-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {prioritizedInvoices.map((invoice) => (
                    <tr key={invoice._id} className="border-t border-slate-100">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-slate-500">{invoice.projectId.code ? `${invoice.projectId.code} · ` : ''}{invoice.projectId.name}</p>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{invoice.clientId.name}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${invoice.daysOverdue >= 30 ? 'bg-rose-100 text-rose-700' : invoice.daysOverdue >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {invoice.daysOverdue} días
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">{money(invoice.totalAmount)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-3">
                          <InlineStatusEditor
                            value={invoiceStatusDrafts[invoice._id] ?? invoice.status}
                            options={[
                              { value: 'pendiente', label: 'Pendiente' },
                              { value: 'pagada', label: 'Pagada' },
                              { value: 'vencida', label: 'Vencida' },
                              { value: 'anulada', label: 'Anulada' },
                            ]}
                            onChange={(value) => setInvoiceStatusDrafts((current) => ({ ...current, [invoice._id]: value as OverdueInvoice['status'] }))}
                            onSave={() => updateStatus(
                              `invoice:${invoice._id}`,
                              `/api/finance/admin/invoices/${invoice._id}`,
                              { status: invoiceStatusDrafts[invoice._id] ?? invoice.status },
                              'Estado de factura actualizado.',
                              () => setInvoiceStatusDrafts((current) => {
                                const next = { ...current }
                                delete next[invoice._id]
                                return next
                              })
                            )}
                            saving={statusSavingKey === `invoice:${invoice._id}`}
                            meta={formatAuditMeta(invoice.updatedBy, invoice.updatedAt)}
                          />
                          <button type="button" onClick={() => prefillInvoiceAction(invoice)} className="text-xs font-bold text-blue-700">
                            Gestionar
                          </button>
                          <button type="button" onClick={() => createCalendarReminder('invoice', invoice._id)} className="text-xs font-bold text-emerald-700">
                            Calendar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!prioritizedInvoices.length && !loading && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500">No hay facturas vencidas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <BellRing className="h-5 w-5 text-blue-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Registrar gestión</h2>
                <p className="text-sm text-slate-500">Llamadas, correos, compromisos y notas de cobranza.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              <Field label="Tipo">
                <select value={form.actionType} onChange={(event) => setForm((current) => ({ ...current, actionType: event.target.value as CollectionForm['actionType'] }))} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="call">Llamada</option>
                  <option value="email">Correo</option>
                  <option value="promise">Compromiso de pago</option>
                  <option value="warning">Advertencia</option>
                  <option value="payment">Pago informado</option>
                  <option value="note">Nota</option>
                  <option value="status_change">Cambio de estado</option>
                </select>
              </Field>
              <Field label="Título">
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" />
              </Field>
              <Field label="Fecha compromiso / seguimiento">
                <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" />
              </Field>
              <Field label="Detalle">
                <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" />
              </Field>
              <button type="button" onClick={saveAction} disabled={saving} className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                {saving ? 'Guardando...' : 'Guardar gestión'}
              </button>
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-amber-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Cuotas vencidas</h2>
                <p className="text-sm text-slate-500">Detalle operativo para cobranza fina por cuota.</p>
              </div>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4">Cuota</th>
                    <th className="pb-3 pr-4">Cliente</th>
                    <th className="pb-3 pr-4">Vence</th>
                    <th className="pb-3 pr-4">Monto</th>
                    <th className="pb-3 pr-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueInstallments.map((installment) => (
                    <tr key={installment._id} className="border-t border-slate-100">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-900">Cuota {installment.installmentNumber}</p>
                        <p className="text-xs text-slate-500">{installment.invoiceId.invoiceNumber}</p>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{installment.clientId.name}</td>
                      <td className="py-3 pr-4 text-slate-700">{dateValue(installment.dueDate)}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">{money(installment.amount)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-3">
                          <InlineStatusEditor
                            value={installmentStatusDrafts[installment._id] ?? installment.status}
                            options={[
                              { value: 'pendiente', label: 'Pendiente' },
                              { value: 'pago_parcial', label: 'Parcial' },
                              { value: 'pagada', label: 'Pagada' },
                              { value: 'vencida', label: 'Vencida' },
                              { value: 'anulada', label: 'Anulada' },
                            ]}
                            onChange={(value) => setInstallmentStatusDrafts((current) => ({ ...current, [installment._id]: value as OverdueInstallment['status'] }))}
                            onSave={() => updateStatus(
                              `installment:${installment._id}`,
                              `/api/finance/admin/installments/${installment._id}`,
                              { status: installmentStatusDrafts[installment._id] ?? installment.status },
                              'Estado de cuota actualizado.',
                              () => setInstallmentStatusDrafts((current) => {
                                const next = { ...current }
                                delete next[installment._id]
                                return next
                              })
                            )}
                            saving={statusSavingKey === `installment:${installment._id}`}
                            meta={formatAuditMeta(installment.updatedBy, installment.updatedAt)}
                          />
                          <button type="button" onClick={() => prefillInstallmentAction(installment)} className="text-xs font-bold text-blue-700">
                            Gestionar
                          </button>
                          <button type="button" onClick={() => createCalendarReminder('installment', installment._id)} className="text-xs font-bold text-emerald-700">
                            Calendar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!overdueInstallments.length && !loading && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500">No hay cuotas vencidas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-slate-800" />
              <div>
                <h2 className="text-lg font-bold text-slate-950">Historial de gestiones</h2>
                <p className="text-sm text-slate-500">Bitácora viva de seguimiento y compromisos.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {actions.map((action) => (
                <div key={action._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{action.title}</p>
                      <p className="text-xs text-slate-500">
                        {action.entityType === 'invoice' ? `Factura ${action.invoiceId?.invoiceNumber}` : `Cuota ${action.installmentId?.installmentNumber}`} · {action.clientId?.name || 'Sin cliente'} · {dateValue(action.createdAt)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${action.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {action.status === 'resolved' ? 'Resuelta' : 'Pendiente'}
                    </span>
                  </div>
                  {action.description && <p className="mt-3 text-sm text-slate-700">{action.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{action.actionType}</span>
                    {action.dueDate && <span>Seguimiento: {dateValue(action.dueDate)}</span>}
                    <span>Creado por: {action.createdBy || 'sistema'}</span>
                    {action.status !== 'resolved' && (
                      <button type="button" onClick={() => resolveAction(action._id)} className="font-bold text-emerald-700">
                        Marcar resuelta
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!actions.length && !loading && <p className="text-sm text-slate-500">Aun no hay gestiones registradas.</p>}
            </div>
          </article>
        </section>
      </div>
    </AdminShell>
  )
}

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: string }) {
  return (
    <article className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-300">{label}</p>
        <div className={`rounded-2xl ${tone} p-2`}><Icon className="h-5 w-5" /></div>
      </div>
      <p className="mt-6 text-3xl font-black tracking-tight">{value}</p>
    </article>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  )
}

function InlineStatusEditor({
  value,
  options,
  onChange,
  onSave,
  saving,
  meta,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  onSave: () => void
  saving: boolean
  meta?: string
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-slate-950 px-2 py-1 text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? '...' : 'OK'}
        </button>
      </div>
      {meta ? <p className="text-[11px] text-slate-500">{meta}</p> : null}
    </div>
  )
}
