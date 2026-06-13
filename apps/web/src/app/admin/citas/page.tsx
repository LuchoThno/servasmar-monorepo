'use client'

import { CalendarCheck, Download, Settings, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useApiClient } from '@/lib/useApiClient'

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

const emptySummary: Summary = { pendientes: 0, aprobadas: 0, rechazadas: 0, proximas: 0 }
const defaultAvailability: Availability = {
  businessDays: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '18:00',
  meetingDurationMinutes: 60,
  blockedSlots: [],
}

export default function AdminAppointmentsPage() {
  const { authHeaders, isLoaded, isSignedIn, requestJson } = useApiClient()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [summary, setSummary] = useState<Summary>(emptySummary)
  const [availability, setAvailability] = useState<Availability>(defaultAvailability)
  const [filters, setFilters] = useState({ status: '', date: '', search: '' })
  const [finalDate, setFinalDate] = useState('')
  const [finalTime, setFinalTime] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [blockedSlot, setBlockedSlot] = useState({ date: '', start: '09:00', end: '10:00', reason: '' })

  const loadDashboard = async () => {
    if (!isSignedIn) return
    const data = await requestJson<{ summary: Summary }>('/api/appointments/admin/dashboard')
    if (data) setSummary(data.summary)
  }

  const loadAppointments = async () => {
    if (!isSignedIn) return
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.date) params.set('date', filters.date)
    if (filters.search) params.set('search', filters.search)

    const data = await requestJson<{ appointments: Appointment[] }>(`/api/appointments/admin?${params.toString()}`)
    if (data) setAppointments(data.appointments || [])
  }

  const loadAvailability = async () => {
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
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    Promise.all([loadDashboard(), loadAppointments(), loadAvailability()]).finally(() => setLoading(false))
  }, [filters, isLoaded, isSignedIn, requestJson])

  const refresh = async () => {
    await Promise.all([loadDashboard(), loadAppointments()])
  }

  const selectAppointment = (appointment: Appointment) => {
    setSelected(appointment)
    setFinalDate(appointment.fechaSolicitada.slice(0, 10))
    setFinalTime(appointment.horaSolicitada)
    setRejectReason('')
    setMessage('')
  }

  const approve = async () => {
    if (!selected) return
    setMessage('Aprobando cita y creando Google Meet...')
    const response = await fetch(`/api/appointments/admin/${selected._id}/approve`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ fechaFinal: finalDate, horaFinal: finalTime }),
    })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data?.error?.message || 'No pudimos aprobar la cita')
      return
    }
    setSelected(data.appointment)
    setMessage(data.emailWarning || 'Cita aprobada y correo enviado.')
    await refresh()
  }

  const reject = async () => {
    if (!selected) return
    const response = await fetch(`/api/appointments/admin/${selected._id}/reject`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ motivoRechazo: rejectReason }),
    })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data?.error?.message || 'No pudimos rechazar la cita')
      return
    }
    setSelected(data.appointment)
    setMessage(data.emailWarning || 'Cita rechazada y correo enviado.')
    await refresh()
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
              </select>
              <input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} className="h-11 rounded-md border border-slate-300 px-3 text-sm" />
              <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Nombre, correo o empresa" className="h-11 rounded-md border border-slate-300 px-3 text-sm md:col-span-2" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Solicitante</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Hora</th>
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
                      <td className="px-4 py-3">{appointment.fechaSolicitada.slice(0, 10)}</td>
                      <td className="px-4 py-3">{appointment.horaFinal || appointment.horaSolicitada}</td>
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
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No hay citas con estos filtros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-bold text-slate-950">Detalle</h2>
              </div>
              {selected ? (
                <div className="mt-5 space-y-4 text-sm text-slate-700">
                  <p><strong>{selected.nombre}</strong> - {selected.empresa}</p>
                  <p>{selected.email} · {selected.telefono}</p>
                  <p><strong>Motivo:</strong> {selected.motivo}</p>
                  {selected.observaciones && <p><strong>Observaciones:</strong> {selected.observaciones}</p>}
                  {selected.googleMeetLink && <a href={selected.googleMeetLink} target="_blank" className="block font-bold text-blue-700">Abrir Google Meet</a>}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Fecha final
                      <input type="date" value={finalDate} onChange={(event) => setFinalDate(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-950" />
                    </label>
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Hora final
                      <input type="time" value={finalTime} onChange={(event) => setFinalTime(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-950" />
                    </label>
                  </div>
                  <button onClick={approve} disabled={selected.estado === 'aprobada'} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-green-700 px-4 text-sm font-bold text-white disabled:opacity-50">
                    <CalendarCheck className="h-4 w-4" />
                    Aprobar y crear Meet
                  </button>
                  <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={3} placeholder="Motivo del rechazo" className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <button onClick={reject} disabled={!rejectReason.trim()} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50">
                    <XCircle className="h-4 w-4" />
                    Rechazar
                  </button>
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-500">Selecciona una cita para ver detalles y acciones.</p>
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
