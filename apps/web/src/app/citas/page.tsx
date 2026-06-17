'use client'

import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  FileText,
  Mail,
  Send,
  ShieldCheck,
  Video,
} from 'lucide-react'
import Image from 'next/image'
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

const processSteps = [
  { icon: FileText, label: 'Solicitud', detail: 'Recibimos tus datos y contexto.' },
  { icon: ShieldCheck, label: 'Revisión', detail: 'Validamos disponibilidad y alcance.' },
  { icon: Video, label: 'Meet', detail: 'Confirmamos por correo con enlace.' },
]

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
    <main className="min-h-screen bg-slate-100">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/services/concesiones-maritimas.png"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-slate-950/80" />

        <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="relative flex h-12 w-12 overflow-hidden rounded-md bg-white p-1.5">
                <Image src="/images/logo2.png" alt="SERVASMAR" fill className="object-contain" sizes="48px" />
              </span>
              <span>
                <span className="block text-sm font-black tracking-wide text-white">SERVASMAR</span>
                <span className="block text-xs font-semibold text-cyan-200">Agenda empresarial</span>
              </span>
            </Link>
          </div>

          <div className="grid gap-8 pb-12 pt-14 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-200 transition hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Volver al sitio
              </Link>
              <div className="mb-5 inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-100 ring-1 ring-white/10">
                <CalendarDays className="h-4 w-4" />
                Reuniones por Google Meet
              </div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Agenda una reunión técnica con SERVASMAR.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
                Selecciona un horario disponible, cuéntanos el motivo de la reunión y nuestro equipo revisará la solicitud para confirmar el enlace de Meet por correo.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-bold uppercase tracking-wide text-cyan-200">Proceso</p>
              <div className="mt-4 grid gap-3">
                {processSteps.map((step) => {
                  const Icon = step.icon
                  return (
                    <div key={step.label} className="flex gap-3 rounded-md bg-white/10 p-3 ring-1 ring-white/10">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-300 text-slate-950">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{step.label}</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-300">{step.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
        <aside className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-700 text-white">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fecha elegida</p>
                <p className="font-bold capitalize text-slate-950">{selectedDateLabel}</p>
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
              className="mt-2 h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              required
            />

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-700">Horarios disponibles *</p>
                {form.fechaSolicitada && <span className="text-xs font-semibold text-slate-500">{slots.length} horarios</span>}
              </div>
              <div className="mt-3 grid min-h-[92px] grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {loadingSlots ? (
                  <p className="col-span-full rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Cargando horarios...</p>
                ) : slots.length ? (
                  slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => updateField('horaSolicitada', slot)}
                      className={`h-11 rounded-md border text-sm font-bold transition ${
                        form.horaSolicitada === slot
                          ? 'border-blue-700 bg-blue-700 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))
                ) : (
                  <p className="col-span-full rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                    {form.fechaSolicitada ? 'No hay horarios disponibles para esta fecha.' : 'Selecciona una fecha para ver horarios.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
            <div className="flex gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <p className="text-sm font-bold text-blue-950">Confirmación por correo</p>
                <p className="mt-1 text-sm leading-6 text-blue-900">
                  Al aprobarse la solicitud recibirás el enlace de Google Meet y los datos de la reunión.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Solicitud de reunión</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Datos para coordinar</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Completa la información principal para revisar tu requerimiento.
              </p>
            </div>
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-blue-700 sm:flex">
              <Send className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
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
              className="mt-2 h-12 w-full rounded-md border border-slate-300 px-4 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              placeholder="Ej: Asesoría para concesión marítima"
            />
          </label>

          <label className="mt-5 block text-sm font-bold text-slate-700">
            Observaciones
            <textarea
              value={form.observaciones}
              onChange={(event) => updateField('observaciones', event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-md border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
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
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-6 text-sm font-bold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
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
