'use client'

import { CalendarCheck, Download, Plus, RotateCcw, Save, Settings, Users, XCircle } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useApiClient } from '@/lib/useApiClient'

type LinkedClient = {
  _id: string
  name: string
  email: string
  contacts: Array<{ name: string; email: string }>
}

type Appointment = {
  _id: string
  nombre: string
  empresa: string
  email: string
  telefono: string
  motivo: string
  observaciones?: string
  fechaSolicitada: string
  horaSolicitada: string
  fechaFinal?: string
  horaFinal?: string
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'
  googleMeetLink?: string
  motivoRechazo?: string
  createdAt: string
  linkedClientIds?: LinkedClient[]
}

type AppointmentForm = {
  nombre: string
  empresa: string
  email: string
  telefono: string
  motivo: string
  fechaSolicitada: string
  horaSolicitada: string
  observaciones: string
  linkedClientIds: string[]
}

type CrmClient = {
  _id: string
  name: string
  email: string
  contacts: Array<{ name: string; email: string }>
}

type Summary = {
  pendientes: number
  aprobadas: number
  rechazadas: number
  proximas: number
}

type Availability = {
  businessDays: number[]
  startTime: string
  endTime: string
  meetingDurationMinutes: number
  blockedSlots: Array<{ date: string; start: string; end: string; reason?: string }>
}

type GoogleStatus = {
  configured: boolean
  calendarId: string
  missing: string[]
  message: string
}

const emptySummary: Summary = { pendientes: 0, aprobadas: 0, rechazadas: 0, proximas: 0 }
const defaultAvailability: Availability = {
  businessDays: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '18:00',
  meetingDurationMinutes: 60,
  blockedSlots: [],
}
const emptyAppointmentForm: AppointmentForm = {
  nombre: '',
  empresa: '',
  email: '',
  telefono: '',
  motivo: '',
  fechaSolicitada: '',
  horaSolicitada: '',
  observaciones: '',
  linkedClientIds: [],
}

const toInputDate = (value?: string) => (value ? value.slice(0, 10) : '')

const toAppointmentForm = (appointment: Appointment): AppointmentForm => ({
  nombre: appointment.nombre || '',
  empresa: appointment.empresa || '',
  email: appointment.email || '',
  telefono: appointment.telefono || '',
  motivo: appointment.motivo || '',
  fechaSolicitada: toInputDate(appointment.fechaSolicitada),
  horaSolicitada: appointment.horaSolicitada || '',
  observaciones: appointment.observaciones || '',
  linkedClientIds: appointment.linkedClientIds?.map((client) => client._id) || [],
})

export default function AdminAppointmentsPage() {
  const { authHeaders, isLoaded, isSignedIn, requestJson } = useApiClient()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<CrmClient[]>([])
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [summary, setSummary] = useState<Summary>(emptySummary)
  const [availability, setAvailability] = useState<Availability>(defaultAvailability)
  const [filters, setFilters] = useState({ status: '', date: '', search: '' })
  const [editorForm, setEditorForm] = useState<AppointmentForm>(emptyAppointmentForm)
  const [createForm, setCreateForm] = useState<AppointmentForm>(emptyAppointmentForm)
  const [finalDate, setFinalDate] = useState('')
  const [finalTime, setFinalTime] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingEditor, setSavingEditor] = useState(false)
  const [creatingAppointment, setCreatingAppointment] = useState(false)
  const [processingApproval, setProcessingApproval] = useState(false)
  const [processingReject, setProcessingReject] = useState(false)
  const [processingReopen, setProcessingReopen] = useState(false)
  const [blockedSlot, setBlockedSlot] = useState({ date: '', start: '09:00', end: '10:00', reason: '' })
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!isSignedIn) return
    const data = await requestJson<{ summary: Summary }>('/api/appointments/admin/dashboard')
    if (data) setSummary(data.summary)
  }, [isSignedIn, requestJson])

  const loadAppointments = useCallback(async () => {
    if (!isSignedIn) return
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.date) params.set('date', filters.date)
    if (filters.search) params.set('search', filters.search)

    const data = await requestJson<{ appointments: Appointment[] }>(`/api/appointments/admin?${params.toString()}`)
    if (data) setAppointments(data.appointments || [])
  }, [filters.date, filters.search, filters.status, isSignedIn, requestJson])

  const loadClients = useCallback(async () => {
    if (!isSignedIn) return
    const data = await requestJson<{ clients: CrmClient[] }>('/api/crm/admin/clients')
    if (data) setClients(data.clients || [])
  }, [isSignedIn, requestJson])

  const loadAvailability = useCallback(async () => {
    if (!isSignedIn) return
    const data = await requestJson<{ availability?: Availability }>('/api/availability')
    if (data?.availability) {
      setAvailability({
        businessDays: data.availability.businessDays,
        startTime: data.availability.startTime,
        endTime: data.availability.endTime,
        meetingDurationMinutes: data.availability.meetingDurationMinutes,
        blockedSlots: data.availability.blockedSlots || [],
      })
    }
  }, [isSignedIn, requestJson])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    Promise.allSettled([loadDashboard(), loadAppointments(), loadAvailability(), loadClients()])
      .then((results) => {
        const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
        if (rejected) {
          setMessage(rejected.reason instanceof Error ? rejected.reason.message : 'No pudimos cargar todos los datos de citas.')
        }
      })
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, loadAppointments, loadAvailability, loadClients, loadDashboard])

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([loadDashboard(), loadAppointments(), loadClients()])
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (rejected) {
      setMessage(rejected.reason instanceof Error ? rejected.reason.message : 'No pudimos actualizar las citas.')
    }
  }, [loadAppointments, loadClients, loadDashboard])

  const selectedLinkedClients = useMemo(
    () => clients.filter((client) => editorForm.linkedClientIds.includes(client._id)),
    [clients, editorForm.linkedClientIds]
  )

  const selectAppointment = (appointment: Appointment) => {
    setSelected(appointment)
    setEditorForm(toAppointmentForm(appointment))
    setFinalDate(toInputDate(appointment.fechaFinal || appointment.fechaSolicitada))
    setFinalTime(appointment.horaFinal || appointment.horaSolicitada)
    setRejectReason(appointment.motivoRechazo || '')
    setMessage('')
  }

  const toggleClientLink = (target: 'editor' | 'create', clientId: string) => {
    const setter = target === 'editor' ? setEditorForm : setCreateForm
    setter((current) => ({
      ...current,
      linkedClientIds: current.linkedClientIds.includes(clientId)
        ? current.linkedClientIds.filter((value) => value !== clientId)
        : [...current.linkedClientIds, clientId],
    }))
  }

  const saveDetails = async () => {
    if (!selected) return
    setSavingEditor(true)
    setMessage('')
    try {
      const data = await requestJson<{ appointment: Appointment }>(`/api/appointments/admin/${selected._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...editorForm,
          estado: selected.estado === 'rechazada' ? 'pendiente' : selected.estado === 'cancelada' ? 'cancelada' : undefined,
        }),
      })
      if (data?.appointment) {
        setSelected(data.appointment)
        setEditorForm(toAppointmentForm(data.appointment))
      }
      await refresh()
      setMessage('Detalle de cita actualizado.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar la cita')
    } finally {
      setSavingEditor(false)
    }
  }

  const createAppointment = async () => {
    setCreatingAppointment(true)
    setMessage('')
    try {
      const data = await requestJson<{ appointment: Appointment }>('/api/appointments/admin', {
        method: 'POST',
        body: JSON.stringify(createForm),
      })
      if (data?.appointment) {
        selectAppointment(data.appointment)
      }
      setCreateForm(emptyAppointmentForm)
      await refresh()
      setMessage('Cita creada en estado pendiente. Ya puedes aprobarla o ajustarla.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos crear la cita')
    } finally {
      setCreatingAppointment(false)
    }
  }

  const approve = async () => {
    if (!selected) return
    setProcessingApproval(true)
    setMessage('Aprobando cita y creando Google Meet...')
    try {
      const data = await requestJson<{ appointment: Appointment; emailWarning?: string }>(`/api/appointments/admin/${selected._id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ fechaFinal: finalDate, horaFinal: finalTime }),
      })
      if (data?.appointment) {
        setSelected(data.appointment)
        setEditorForm(toAppointmentForm(data.appointment))
      }
      await refresh()
      setMessage(data?.emailWarning || 'Cita aprobada, Meet creado y asistentes notificados.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos aprobar la cita')
    } finally {
      setProcessingApproval(false)
    }
  }

  const reject = async () => {
    if (!selected) return
    setProcessingReject(true)
    try {
      const data = await requestJson<{ appointment: Appointment; emailWarning?: string }>(`/api/appointments/admin/${selected._id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ motivoRechazo: rejectReason }),
      })
      if (data?.appointment) {
        setSelected(data.appointment)
      }
      await refresh()
      setMessage(data?.emailWarning || 'Cita rechazada y correo enviado.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos rechazar la cita')
    } finally {
      setProcessingReject(false)
    }
  }

  const reopenRejectedAppointment = async () => {
    if (!selected) return
    setProcessingReopen(true)
    try {
      const data = await requestJson<{ appointment: Appointment }>(`/api/appointments/admin/${selected._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...editorForm, estado: 'pendiente' }),
      })
      if (data?.appointment) {
        setSelected(data.appointment)
        setEditorForm(toAppointmentForm(data.appointment))
        setRejectReason('')
      }
      await refresh()
      setMessage('Cita reactivada a pendiente.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos reactivar la cita')
    } finally {
      setProcessingReopen(false)
    }
  }

  const saveAvailability = async () => {
    const response = await fetch('/api/availability', {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(availability),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Disponibilidad actualizada.' : data?.error?.message || 'No pudimos guardar disponibilidad')
  }

  const checkGoogleStatus = async () => {
    try {
      setMessage('Verificando conexión con Google Calendar...')
      const data = await requestJson<{ google: GoogleStatus }>('/api/appointments/admin/google/status')
      if (data?.google) {
        setGoogleStatus(data.google)
        setMessage(data.google.message)
      }
    } catch (error) {
      setGoogleStatus({
        configured: false,
        calendarId: googleStatus?.calendarId || 'primary',
        missing: [],
        message: error instanceof Error ? error.message : 'No pudimos verificar Google Calendar',
      })
      setMessage(error instanceof Error ? error.message : 'No pudimos verificar Google Calendar')
    }
  }

  const addBlockedSlot = () => {
    if (!blockedSlot.date || !blockedSlot.start || !blockedSlot.end) return
    setAvailability({
      ...availability,
      blockedSlots: [...availability.blockedSlots, blockedSlot],
    })
    setBlockedSlot({ date: '', start: '09:00', end: '10:00', reason: '' })
  }

  const exportCsv = async () => {
    const response = await fetch('/api/appointments/admin/export', { headers: await authHeaders() })
    if (!response.ok) {
      setMessage('No pudimos exportar las citas.')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'citas-servasmar.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">Cargando panel...</main>
  }

  return (
    <AdminShell title="Gestión de citas">
      <section className="mx-auto grid max-w-7xl gap-6">
        <div className="flex justify-end">
          <button onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100">
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Pendientes" value={summary.pendientes} tone="bg-yellow-50 text-yellow-800 border-yellow-200" />
          <Metric label="Aprobadas" value={summary.aprobadas} tone="bg-green-50 text-green-800 border-green-200" />
          <Metric label="Rechazadas" value={summary.rechazadas} tone="bg-red-50 text-red-800 border-red-200" />
          <Metric label="Próximas" value={summary.proximas} tone="bg-blue-50 text-blue-800 border-blue-200" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-4">
              <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm">
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="cancelada">Cancelada</option>
              </select>
              <input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm" />
              <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Nombre, correo o empresa" className="h-11 rounded-md border border-slate-300 px-3 text-sm md:col-span-2" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Solicitante</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Clientes CRM</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment._id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-950">{appointment.nombre}</p>
                        <p className="text-slate-500">{appointment.email}</p>
                      </td>
                      <td className="px-4 py-3">{toInputDate(appointment.fechaSolicitada)}</td>
                      <td className="px-4 py-3">{appointment.horaFinal || appointment.horaSolicitada}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {appointment.linkedClientIds?.length ? appointment.linkedClientIds.map((client) => client.name).join(', ') : 'Sin vincular'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={appointment.estado} /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => selectAppointment(appointment)} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!appointments.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No hay citas con estos filtros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <Plus className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-950">Nueva cita manual</h2>
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                <FormField label="Nombre">
                  <input value={createForm.nombre} onChange={(event) => setCreateForm((current) => ({ ...current, nombre: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                </FormField>
                <FormField label="Empresa">
                  <input value={createForm.empresa} onChange={(event) => setCreateForm((current) => ({ ...current, empresa: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Email">
                    <input value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                  </FormField>
                  <FormField label="Teléfono">
                    <input value={createForm.telefono} onChange={(event) => setCreateForm((current) => ({ ...current, telefono: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Fecha solicitada">
                    <input type="date" value={createForm.fechaSolicitada} onChange={(event) => setCreateForm((current) => ({ ...current, fechaSolicitada: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                  </FormField>
                  <FormField label="Hora solicitada">
                    <input type="time" value={createForm.horaSolicitada} onChange={(event) => setCreateForm((current) => ({ ...current, horaSolicitada: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                  </FormField>
                </div>
                <FormField label="Motivo">
                  <textarea value={createForm.motivo} onChange={(event) => setCreateForm((current) => ({ ...current, motivo: event.target.value }))} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </FormField>
                <FormField label="Observaciones">
                  <textarea value={createForm.observaciones} onChange={(event) => setCreateForm((current) => ({ ...current, observaciones: event.target.value }))} rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </FormField>
                <ClientSelector clients={clients} selectedIds={createForm.linkedClientIds} onToggle={(clientId) => toggleClientLink('create', clientId)} />
                <button onClick={createAppointment} disabled={creatingAppointment} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">
                  <Plus className="h-4 w-4" />
                  {creatingAppointment ? 'Creando...' : 'Crear cita'}
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-bold text-slate-950">Detalle y gestión</h2>
              </div>
              {selected ? (
                <div className="mt-5 grid gap-4 text-sm text-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{selected.nombre}</p>
                      <p className="text-slate-500">{selected.email} · {selected.telefono}</p>
                    </div>
                    <StatusBadge status={selected.estado} />
                  </div>

                  {selected.motivoRechazo ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      <strong>Último rechazo:</strong> {selected.motivoRechazo}
                    </div>
                  ) : null}

                  {selected.googleMeetLink ? <a href={selected.googleMeetLink} target="_blank" className="font-bold text-blue-700">Abrir Google Meet</a> : null}

                  <FormField label="Nombre">
                    <input value={editorForm.nombre} onChange={(event) => setEditorForm((current) => ({ ...current, nombre: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                  </FormField>
                  <FormField label="Empresa">
                    <input value={editorForm.empresa} onChange={(event) => setEditorForm((current) => ({ ...current, empresa: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Email">
                      <input value={editorForm.email} onChange={(event) => setEditorForm((current) => ({ ...current, email: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                    </FormField>
                    <FormField label="Teléfono">
                      <input value={editorForm.telefono} onChange={(event) => setEditorForm((current) => ({ ...current, telefono: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Fecha solicitada">
                      <input type="date" value={editorForm.fechaSolicitada} onChange={(event) => setEditorForm((current) => ({ ...current, fechaSolicitada: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                    </FormField>
                    <FormField label="Hora solicitada">
                      <input type="time" value={editorForm.horaSolicitada} onChange={(event) => setEditorForm((current) => ({ ...current, horaSolicitada: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                    </FormField>
                  </div>
                  <FormField label="Motivo">
                    <textarea value={editorForm.motivo} onChange={(event) => setEditorForm((current) => ({ ...current, motivo: event.target.value }))} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                  </FormField>
                  <FormField label="Observaciones">
                    <textarea value={editorForm.observaciones} onChange={(event) => setEditorForm((current) => ({ ...current, observaciones: event.target.value }))} rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                  </FormField>

                  <ClientSelector clients={clients} selectedIds={editorForm.linkedClientIds} onToggle={(clientId) => toggleClientLink('editor', clientId)} />

                  {!!selectedLinkedClients.length && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                        <Users className="h-4 w-4" />
                        Correos que se notificarán al aprobar
                      </p>
                      <div className="grid gap-1 text-xs text-slate-600">
                        <span>{editorForm.email}</span>
                        {selectedLinkedClients.map((client) => (
                          <div key={client._id}>
                            {client.email ? <span className="block">{client.name}: {client.email}</span> : null}
                            {client.contacts.filter((contact) => contact.email).map((contact) => (
                              <span key={`${client._id}-${contact.email}`} className="block">{contact.name || client.name}: {contact.email}</span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={saveDetails} disabled={savingEditor} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {savingEditor ? 'Guardando...' : 'Guardar detalle'}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Fecha final Meet">
                      <input type="date" value={finalDate} onChange={(event) => setFinalDate(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                    </FormField>
                    <FormField label="Hora final Meet">
                      <input type="time" value={finalTime} onChange={(event) => setFinalTime(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3" />
                    </FormField>
                  </div>

                  <button onClick={approve} disabled={selected.estado === 'aprobada' || processingApproval} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-green-700 px-4 text-sm font-bold text-white disabled:opacity-50">
                    <CalendarCheck className="h-4 w-4" />
                    {processingApproval ? 'Creando Meet...' : selected.estado === 'rechazada' ? 'Aprobar cita rechazada y crear Meet' : 'Aprobar y crear Meet'}
                  </button>

                  {selected.estado === 'rechazada' ? (
                    <button onClick={reopenRejectedAppointment} disabled={processingReopen} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-800 disabled:opacity-50">
                      <RotateCcw className="h-4 w-4" />
                      {processingReopen ? 'Reactivando...' : 'Reactivar a pendiente'}
                    </button>
                  ) : null}

                  <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={3} placeholder="Motivo del rechazo" className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <button onClick={reject} disabled={!rejectReason.trim() || processingReject} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50">
                    <XCircle className="h-4 w-4" />
                    {processingReject ? 'Rechazando...' : 'Rechazar'}
                  </button>
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-500">Selecciona una cita para editarla, vincular clientes CRM o aprobar una rechazada.</p>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-bold text-slate-950">Disponibilidad</h2>
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                <label>
                  Inicio
                  <input type="time" value={availability.startTime} onChange={(event) => setAvailability({ ...availability, startTime: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" />
                </label>
                <label>
                  Término
                  <input type="time" value={availability.endTime} onChange={(event) => setAvailability({ ...availability, endTime: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" />
                </label>
                <label>
                  Duración por reunión
                  <input type="number" min={15} max={240} value={availability.meetingDurationMinutes} onChange={(event) => setAvailability({ ...availability, meetingDurationMinutes: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" />
                </label>
                <div>
                  <p className="mb-2 font-semibold">Días hábiles</p>
                  <div className="grid grid-cols-4 gap-2">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
                      <label key={day} className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={availability.businessDays.includes(index)}
                          onChange={(event) => {
                            const nextDays = event.target.checked
                              ? [...availability.businessDays, index]
                              : availability.businessDays.filter((value) => value !== index)
                            setAvailability({ ...availability, businessDays: nextDays.sort() })
                          }}
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold">Bloques no disponibles</p>
                  <div className="mt-3 grid gap-2">
                    <input type="date" value={blockedSlot.date} onChange={(event) => setBlockedSlot({ ...blockedSlot, date: event.target.value })} className="h-10 rounded-md border border-slate-300 px-3" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="time" value={blockedSlot.start} onChange={(event) => setBlockedSlot({ ...blockedSlot, start: event.target.value })} className="h-10 rounded-md border border-slate-300 px-3" />
                      <input type="time" value={blockedSlot.end} onChange={(event) => setBlockedSlot({ ...blockedSlot, end: event.target.value })} className="h-10 rounded-md border border-slate-300 px-3" />
                    </div>
                    <input value={blockedSlot.reason} onChange={(event) => setBlockedSlot({ ...blockedSlot, reason: event.target.value })} placeholder="Motivo" className="h-10 rounded-md border border-slate-300 px-3" />
                    <button type="button" onClick={addBlockedSlot} className="h-10 rounded-md border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-800">
                      Agregar bloqueo
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {availability.blockedSlots.map((slot, index) => (
                      <div key={`${slot.date}-${slot.start}-${index}`} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-xs">
                        <span>{slot.date} · {slot.start}-{slot.end} {slot.reason ? `· ${slot.reason}` : ''}</span>
                        <button
                          type="button"
                          onClick={() => setAvailability({
                            ...availability,
                            blockedSlots: availability.blockedSlots.filter((_, currentIndex) => currentIndex !== index),
                          })}
                          className="font-bold text-red-700"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={saveAvailability} className="h-10 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
                  Guardar disponibilidad
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-bold text-slate-950">Google Calendar</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Valida la conexión antes de aprobar citas para evitar fallos al crear la reunión en Google Meet.
              </p>
              {googleStatus ? (
                <div className={`mt-4 rounded-md border p-3 text-sm font-semibold ${googleStatus.configured ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  <p>{googleStatus.message}</p>
                  <p className="mt-1 text-xs">Calendario: {googleStatus.calendarId}</p>
                  {googleStatus.missing.length ? <p className="mt-1 text-xs">Faltan: {googleStatus.missing.join(', ')}</p> : null}
                </div>
              ) : null}
              <button onClick={checkGoogleStatus} className="mt-4 h-10 w-full rounded-md border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-800 hover:bg-blue-100">
                Probar conexión
              </button>
            </section>

            {message && <p className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">{message}</p>}
          </aside>
        </div>
      </section>
    </AdminShell>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg border p-5 ${tone}`}>
      <p className="text-sm font-bold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: Appointment['estado'] }) {
  const classes = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    aprobada: 'bg-green-100 text-green-800',
    rechazada: 'bg-red-100 text-red-800',
    cancelada: 'bg-slate-100 text-slate-700',
  }
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${classes[status]}`}>{status}</span>
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
      {label}
      {children}
    </label>
  )
}

function ClientSelector({
  clients,
  selectedIds,
  onToggle,
}: {
  clients: CrmClient[]
  selectedIds: string[]
  onToggle: (clientId: string) => void
}) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <Users className="h-4 w-4" />
        Vincular clientes CRM y sus contactos
      </p>
      <div className="grid max-h-48 gap-2 overflow-y-auto">
        {clients.map((client) => (
          <label key={client._id} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <input type="checkbox" checked={selectedIds.includes(client._id)} onChange={() => onToggle(client._id)} className="mt-1" />
              <div>
                <p className="font-semibold text-slate-900">{client.name}</p>
                {client.email ? <p className="text-xs text-slate-500">{client.email}</p> : null}
                {client.contacts.filter((contact) => contact.email).length ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {client.contacts.filter((contact) => contact.email).map((contact) => contact.email).join(', ')}
                  </p>
                ) : null}
              </div>
            </div>
          </label>
        ))}
        {!clients.length && <p className="text-sm text-slate-500">No hay clientes CRM disponibles para vincular.</p>}
      </div>
    </div>
  )
}
