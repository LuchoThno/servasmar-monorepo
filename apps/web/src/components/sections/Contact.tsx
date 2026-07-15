'use client'

import { ArrowRight, CheckCircle2, Mail, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'

const contactCards = [
  {
    title: 'Correo',
    value: 'contacto@servasmar.cl',
    href: 'mailto:contacto@servasmar.cl',
    icon: Mail,
  },
  {
    title: 'Cobertura',
    value: 'Chile, puertos y borde costero',
    href: null,
    icon: MapPin,
  },
]

const appointmentSignals = [
  'Revisión del estado actual del proyecto',
  'Detección de brechas documentales o regulatorias',
  'Definición de siguiente etapa con criterio técnico',
]

type ContactProps = {
  mode?: 'contact' | 'appointment'
}

export function Contact({ mode = 'contact' }: ContactProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const isAppointmentRequest = mode === 'appointment'

  useEffect(() => {
    if (!isAppointmentRequest) return

    setFormData((prev) => {
      if (prev.message.trim().length > 0) return prev

      return {
        ...prev,
        message:
          'Quiero agendar una cita para revisar el estado del proyecto, los plazos, el expediente actual y la ruta regulatoria disponible.',
      }
    })
  }, [isAppointmentRequest])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage(null)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setSubmitMessage('Mensaje enviado con éxito. Te responderemos a la brevedad.')
        setFormData({ name: '', email: '', phone: '', company: '', message: '' })
      } else {
        try {
          const payload = await response.json()
          console.error('Contact form error:', payload)
          setSubmitMessage(payload?.error?.message || payload?.message || 'No pudimos enviar el mensaje. Intenta nuevamente o contáctanos por correo.')
        } catch {
          setSubmitMessage('No pudimos enviar el mensaje. Intenta nuevamente o contáctanos por correo.')
        }
        setSubmitStatus('error')
      }
    } catch {
      setSubmitMessage('No pudimos enviar el mensaje. Intenta nuevamente o contáctanos por correo.')
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
      window.setTimeout(() => {
        setSubmitStatus('idle')
        setSubmitMessage(null)
      }, 5000)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <section id="contact" className="py-20 sm:py-24">
      <div className="section-shell">
        <div className="overflow-hidden rounded-[32px] border border-[#10283a] bg-[#071A2B] shadow-[0_30px_80px_rgba(7,26,43,0.12)]">
          <div className="grid gap-0 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
            <div className="border-b border-white/10 bg-[#071A2B] p-8 text-white sm:p-10 lg:border-b-0 lg:border-r lg:border-white/10 lg:p-12">
              <div className="section-kicker border-[#c5a35a] pl-4 text-white/80">
                {isAppointmentRequest ? 'Agenda de evaluación' : 'Conversemos'}
              </div>
              <h2 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl">
                {isAppointmentRequest
                  ? 'Agenda una conversación útil antes de mover el proyecto.'
                  : 'Revisemos el proyecto con una mirada técnica, regulatoria y documental.'}
              </h2>
              <p className="mt-6 text-base leading-8 text-slate-300">
                {isAppointmentRequest
                  ? 'Este espacio está pensado para revisar antecedentes, detectar brechas y definir la ruta más consistente antes de presentar, corregir o regularizar.'
                  : 'Si el proyecto ya tiene observaciones, requiere regularización o necesita mejor estructura antes de ingresar, levantamos el contexto y ordenamos la siguiente etapa.'}
              </p>

              {isAppointmentRequest && (
                <div className="mt-8 grid gap-3">
                  {appointmentSignals.map((item) => (
                    <div
                      key={item}
                      className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold leading-6 text-white/82"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-10 space-y-4">
                {contactCards.map((card) => {
                  const IconComponent = card.icon
                  const content = (
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-400">
                        {card.title}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">{card.value}</p>
                    </div>
                  )

                  return (
                    <div
                      key={card.title}
                      className="flex items-start gap-4 rounded-[22px] border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#c5a35a] text-[#2b2e3a]">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      {card.href ? (
                        <a href={card.href} className="transition hover:text-[#c5a35a]">
                          {content}
                        </a>
                      ) : (
                        content
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white p-8 sm:p-10 lg:p-12">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {isAppointmentRequest ? 'Solicitud de evaluación' : 'Formulario de contacto'}
                </p>
                <h3 className="mt-4 text-4xl font-bold leading-tight text-[#2b2e3a]">
                  {isAppointmentRequest
                    ? 'Déjanos el contexto clave y prepararemos una conversación con foco.'
                    : 'Una revisión temprana evita retrabajo documental y decisiones mal encuadradas.'}
                </h3>
              </div>

              {isAppointmentRequest && (
                <div className="mt-8 rounded-[22px] border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-semibold text-amber-900">
                    El mensaje viene preparado para solicitar una evaluación inicial. Puedes
                    ajustarlo con el contexto específico del proyecto antes de enviarlo.
                  </p>
                </div>
              )}

              {submitStatus === 'success' && (
                <div className="mt-8 flex items-start gap-3 rounded-[22px] border border-green-200 bg-green-50 p-5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                  <p className="text-sm font-semibold text-green-800">
                    {submitMessage || 'Mensaje enviado con éxito. Te responderemos a la brevedad.'}
                  </p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="mt-8 rounded-[22px] border border-red-200 bg-red-50 p-5">
                  <p className="text-sm font-semibold text-red-800">
                    {submitMessage || 'No pudimos enviar el mensaje. Intenta nuevamente o contáctanos por correo.'}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    Nombre completo *
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                      placeholder="Nombre y apellido"
                      className="h-14 rounded-[18px] border border-slate-300 bg-transparent px-5 text-slate-950 outline-none transition focus:border-[#c5a35a] focus:ring-4 focus:ring-amber-100"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    Email *
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      placeholder="correo@empresa.cl"
                      className="h-14 rounded-[18px] border border-slate-300 bg-transparent px-5 text-slate-950 outline-none transition focus:border-[#c5a35a] focus:ring-4 focus:ring-amber-100"
                    />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    Teléfono
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      autoComplete="tel"
                      placeholder="+56 9 0000 0000"
                      className="h-14 rounded-[18px] border border-slate-300 bg-transparent px-5 text-slate-950 outline-none transition focus:border-[#c5a35a] focus:ring-4 focus:ring-amber-100"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    Empresa
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      autoComplete="organization"
                      placeholder="Nombre de la empresa"
                      className="h-14 rounded-[18px] border border-slate-300 bg-transparent px-5 text-slate-950 outline-none transition focus:border-[#c5a35a] focus:ring-4 focus:ring-amber-100"
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Mensaje *
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    placeholder="Cuéntanos el tipo de trámite, ubicación, estado actual y cualquier plazo relevante."
                    className="min-h-[180px] rounded-[22px] border border-slate-300 bg-transparent px-5 py-4 text-slate-950 outline-none transition focus:border-[#c5a35a] focus:ring-4 focus:ring-amber-100"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#c5a35a] px-6 text-sm font-bold uppercase tracking-[0.08em] text-[#2b2e3a] transition hover:bg-[#10283a] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Enviando...' : isAppointmentRequest ? 'Solicitar evaluación' : 'Enviar consulta'}
                  {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                </button>

                <p className="text-xs leading-6 text-slate-500">
                  Usaremos estos datos solo para responder tu solicitud.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
