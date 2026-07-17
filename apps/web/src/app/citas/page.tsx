'use client'

import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LockKeyhole,
  Mail,
  Send,
  ShieldCheck,
  Video,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { TurnstileWidget } from '@/components/security/TurnstileWidget'

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
  { icon: CalendarDays, label: 'Elige fecha y hora', detail: 'Solo ves horarios realmente disponibles.' },
  { icon: FileText, label: 'Completa tus datos', detail: 'Pedimos lo esencial para coordinar.' },
  { icon: ShieldCheck, label: 'Recibe confirmación', detail: 'Validamos y enviamos la reunión por correo.' },
]

const meetingReasons = [
  'Asesoría para concesión marítima',
  'Regularización documental',
  'Evaluación técnica de proyecto',
  'Seguimiento de trámite',
]

const trustHighlights = [
  { label: 'Proceso simple', detail: 'Agenda en pocos pasos y sin fricción.' },
  { label: 'Horarios reales', detail: 'Mostramos disponibilidad actualizada.' },
  { label: 'Solicitud segura', detail: 'Tus datos se envían por un formulario protegido.' },
]

export default function AppointmentRequestPage() {
  const [form, setForm] = useState<FormData>(initialForm)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const isTurnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

  const selectedDateLabel = useMemo(() => {
    if (!form.fechaSolicitada) return 'Selecciona una fecha'
    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${form.fechaSolicitada}T00:00:00.000Z`))
  }, [form.fechaSolicitada])

  const selectedSlotLabel = useMemo(() => {
    if (!form.horaSolicitada) return 'Aún sin horario'
    return `${form.horaSolicitada} hrs`
  }, [form.horaSolicitada])

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
    if (isTurnstileEnabled && !turnstileToken) {
      setStatus('error')
      setMessage('Confirma la verificación de seguridad antes de enviar la solicitud.')
      return
    }
    setSubmitting(true)
    setStatus('idle')
    setMessage('')

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstileToken }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error?.message || 'No pudimos registrar la solicitud')
      }

      setStatus('success')
      setMessage(data.emailWarning || 'Solicitud enviada. Te contactaremos cuando sea revisada por el equipo.')
      setForm(initialForm)
      setSlots([])
      setTurnstileToken('')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'No pudimos registrar la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-x-0 top-0 h-[420px] opacity-[0.08]">
          <Image
            src="/images/services/concesiones-maritimas.png"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.75),rgba(248,250,252,0.98))]" />

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="relative flex h-12 w-12 overflow-hidden rounded-md bg-white p-1.5">
                <Image src="/images/logo2.png" alt="SERVASMAR" fill className="object-contain" sizes="48px" />
              </span>
              <span>
                <span className="block text-sm font-black tracking-wide text-slate-950">SERVASMAR</span>
                <span className="block text-xs font-semibold text-slate-500">Agenda empresarial</span>
              </span>
            </Link>
          </div>

          <div className="grid gap-10 pb-12 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-950">
                <ArrowLeft className="h-4 w-4" />
                Volver al sitio
              </Link>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                <LockKeyhole className="h-4 w-4 text-blue-700" />
                Agendamiento seguro
              </div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                Agenda tu cita de forma simple, clara y profesional.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Elige una fecha, selecciona un horario disponible y completa tus datos. Nuestro equipo revisará tu solicitud y te enviará la confirmación por correo.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {trustHighlights.map((item) => {
                  return (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm font-bold text-slate-950">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Cómo funciona</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Un proceso corto y confiable</h2>

              <div className="mt-6 grid gap-3">
                {processSteps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <div key={step.label} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-slate-950">{step.label}</p>
                          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">0{index + 1}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                  <div>
                    <p className="text-sm font-bold text-slate-950">Confirmación por correo</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Cuando tu solicitud sea aprobada recibirás el enlace de Google Meet y el detalle de la reunión.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-950">Qué tener a mano</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Objetivo de la reunión, plazos importantes y cualquier antecedente que nos ayude a prepararla mejor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8">
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fecha elegida</p>
                <p className="font-bold capitalize text-slate-950">{selectedDateLabel}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <SummaryCard icon={Clock3} label="Horario seleccionado" value={selectedSlotLabel} />
              <SummaryCard icon={Video} label="Modalidad" value="Google Meet" />
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
                  <p className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Cargando horarios...</p>
                ) : slots.length ? (
                  slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => updateField('horaSolicitada', slot)}
                      className={`h-11 rounded-2xl border text-sm font-bold transition ${
                        form.horaSolicitada === slot
                          ? 'border-blue-700 bg-blue-700 text-white shadow-sm shadow-blue-700/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))
                ) : (
                  <p className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                    {form.fechaSolicitada ? 'No hay horarios disponibles para esta fecha.' : 'Selecciona una fecha para ver horarios.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-950">Seguridad y claridad</p>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              <li>Tus datos se usan solo para coordinar la reunión.</li>
              <li>La cita queda sujeta a revisión antes de confirmarse.</li>
              <li>Recibirás la respuesta por correo con los próximos pasos.</li>
            </ul>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Solicitud de reunión</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Datos para coordinar</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Completa solo la información necesaria para confirmar tu solicitud.
              </p>
            </div>
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-blue-700 sm:flex">
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
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              placeholder="Ej: Asesoría para concesión marítima"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            {meetingReasons.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => updateField('motivo', reason)}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                  form.motivo === reason
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>

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

          {isTurnstileEnabled && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-700">Verificación de seguridad</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Confirmamos que la solicitud viene de una persona real antes de enviarla al equipo.
              </p>
              <div className="mt-3">
                <TurnstileWidget onTokenChange={setTurnstileToken} onExpired={() => setTurnstileToken('')} />
              </div>
            </div>
          )}

          {message && (
            <div className={`mt-5 rounded-2xl border p-4 text-sm font-semibold ${
              status === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !form.horaSolicitada || (isTurnstileEnabled && !turnstileToken)}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 text-sm font-bold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </form>
      </section>
    </main>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
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
        className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  )
}
