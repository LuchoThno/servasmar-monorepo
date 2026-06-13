'use client'

import { CalendarDays, CheckCircle2, Clock, Send } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type FormData = {
  nombre: string
  empresa: string
  email: string
  telefono: string
  motivo: string
  fechaSolicitada: string
  horaSolicitada: string
  observaciones: string
}

const initialForm: FormData = {
  nombre: '',
  empresa: '',
  email: '',
  telefono: '',
  motivo: '',
  fechaSolicitada: '',
  horaSolicitada: '',
  observaciones: '',
}

const today = new Date().toISOString().slice(0, 10)

export default function AppointmentRequestPage() {
  const [form, setForm] = useState<FormData>(initialForm)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const selectedDateLabel = useMemo(() => {
    if (!form.fechaSolicitada) return 'Selecciona una fecha'
    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${form.fechaSolicitada}T00:00:00.000Z`))
  }, [form.fechaSolicitada])

  useEffect(() => {
    if (!form.fechaSolicitada) {
      setSlots([])
      return
    }

    const loadSlots = async () => {
      setLoadingSlots(true)
      setForm((current) => ({ ...current, horaSolicitada: '' }))
      try {
        const response = await fetch(`/api/availability/slots?date=${form.fechaSolicitada}`)
        const data = await response.json()
        setSlots(data.slots || [])
      } catch {
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    loadSlots()
  }, [form.fechaSolicitada])

  const updateField = (field: keyof FormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus('idle')
    setMessage('')

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error?.message || 'No pudimos registrar la solicitud')
      }

      setStatus('success')
      setMessage(data.emailWarning || 'Solicitud enviada. Te contactaremos cuando sea revisada por el equipo.')
      setForm(initialForm)
      setSlots([])
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'No pudimos registrar la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="text-sm font-bold uppercase tracking-wide text-cyan-300">
            SERVASMAR
          </Link>
          <Link href="/sign-in" className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
            Admin
          </Link>
        </div>
        <div className="mx-auto grid max-w-6xl gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-200">
              <CalendarDays className="h-4 w-4" />
              Agenda empresarial
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Solicita una reunión con SERVASMAR.
            </h1>
          </div>
          <p className="text-lg leading-8 text-slate-300">
            Selecciona una fecha disponible, completa tus datos y nuestro equipo revisará la solicitud.
            Al aprobarse, recibirás el enlace de Google Meet por correo.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-700 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Fecha elegida</p>
              <p className="font-bold text-slate-950">{selectedDateLabel}</p>
            </div>
          </div>

          <label htmlFor="fechaSolicitada" className="mt-8 block text-sm font-bold text-slate-700">
            Calendario de disponibilidad *
          </label>
          <input
            id="fechaSolicitada"
            type="date"
            min={today}
            value={form.fechaSolicitada}
            onChange={(event) => updateField('fechaSolicitada', event.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-slate-300 px-4 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
            required
          />

          <div className="mt-6">
            <p className="text-sm font-bold text-slate-700">Horarios disponibles *</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {loadingSlots ? (
                <p className="col-span-2 text-sm text-slate-500">Cargando horarios...</p>
              ) : slots.length ? (
                slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => updateField('horaSolicitada', slot)}
                    className={`h-11 rounded-md border text-sm font-bold transition ${
                      form.horaSolicitada === slot
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {slot}
                  </button>
                ))
              ) : (
                <p className="col-span-2 text-sm leading-6 text-slate-500">
                  {form.fechaSolicitada ? 'No hay horarios disponibles para esta fecha.' : 'Selecciona una fecha para ver horarios.'}
                </p>
              )}
            </div>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <h2 className="text-2xl font-bold text-slate-950">Datos de la reunión</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Input label="Nombre completo *" value={form.nombre} onChange={(value) => updateField('nombre', value)} required />
            <Input label="Empresa *" value={form.empresa} onChange={(value) => updateField('empresa', value)} required />
            <Input label="Correo electrónico *" type="email" value={form.email} onChange={(value) => updateField('email', value)} required />
            <Input label="Teléfono *" type="tel" value={form.telefono} onChange={(value) => updateField('telefono', value)} required />
          </div>

          <label className="mt-5 block text-sm font-bold text-slate-700">
            Motivo de la reunión *
            <input
              value={form.motivo}
              onChange={(event) => updateField('motivo', event.target.value)}
              required
              className="mt-2 h-12 w-full rounded-md border border-slate-300 px-4 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              placeholder="Ej: Asesoría para concesión marítima"
            />
          </label>

          <label className="mt-5 block text-sm font-bold text-slate-700">
            Observaciones
            <textarea
              value={form.observaciones}
              onChange={(event) => updateField('observaciones', event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-md border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              placeholder="Cuéntanos contexto, plazos o documentación relevante."
            />
          </label>

          {message && (
            <div className={`mt-5 rounded-md border p-4 text-sm font-semibold ${
              status === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !form.horaSolicitada}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-6 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </form>
      </section>
    </main>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 h-12 w-full rounded-md border border-slate-300 px-4 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  )
}
