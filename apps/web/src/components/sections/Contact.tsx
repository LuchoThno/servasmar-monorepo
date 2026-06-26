'use client'

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { TurnstileWidget } from '@/components/security/TurnstileWidget'

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contacto@servasmar.cl'

const contactInfo = [
  {
    icon: Phone,
    title: 'Teléfono',
    content: '+56 9 6569 8527',
    link: 'tel:+56965698527',
  },
  {
    icon: Mail,
    title: 'Email',
    content: contactEmail,
    link: `mailto:${contactEmail}`,
  },
  {
    icon: MapPin,
    title: 'Cobertura',
    content: 'VIII Región del Biobío y Chile',
    link: null,
  },
  {
    icon: Clock,
    title: 'Horario',
    content: 'Lun - Vie: 9:00 - 18:00',
    link: null,
  },
]

const responsePoints = [
  'Revisión inicial del requerimiento',
  'Identificación de permisos y antecedentes',
  'Propuesta de ruta de trabajo y próximos pasos',
]

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const isTurnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isTurnstileEnabled && !turnstileToken) {
      setSubmitStatus('error')
      setSubmitMessage('Confirma la verificación de seguridad antes de enviar tu consulta.')
      return
    }
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setSubmitMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, turnstileToken }),
      })
      const data = await response.json().catch(() => null)

      if (response.ok) {
        setSubmitStatus('success')
        setSubmitMessage(data?.message || 'Mensaje enviado con éxito. Te contactaremos pronto.')
        setFormData({ name: '', email: '', phone: '', company: '', message: '' })
        setTurnstileToken('')
        setTimeout(() => setSubmitStatus('idle'), 5000)
      } else {
        setSubmitStatus('error')
        setSubmitMessage(data?.error?.message || 'No pudimos enviar el mensaje. Intenta nuevamente o escríbenos por WhatsApp.')
        setTimeout(() => setSubmitStatus('idle'), 5000)
      }
    } catch {
      setSubmitStatus('error')
      setSubmitMessage('No pudimos enviar el mensaje. Intenta nuevamente o escríbenos por WhatsApp.')
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <section id="contact" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
              <Mail className="h-4 w-4" />
              Contacto
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Cuéntanos qué trámite o proyecto necesitas ordenar.
            </h2>
          </div>

          <p className="text-lg leading-8 text-slate-600">
            Escríbenos desde la Región del Biobío o cualquier zona costera de Chile. Te orientamos
            sobre documentación, permisos y pasos necesarios para avanzar con claridad.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-6">
            <div className="rounded-lg bg-slate-950 p-6 text-white shadow-xl sm:p-8">
              <ShieldCheck className="h-10 w-10 text-cyan-300" />
              <h3 className="mt-5 text-2xl font-bold text-white">Respuesta clara y documentada</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Nuestro equipo revisa cada solicitud con foco técnico, normativo y operativo.
              </p>

              <ul className="mt-6 space-y-3">
                {responsePoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm leading-6 text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <a
                href="https://wa.me/56965698527?text=Hola%2C%20necesito%20asesor%C3%ADa%20para%20un%20proyecto%20mar%C3%ADtimo"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-bold text-blue-800 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/20"
              >
                <MessageCircle className="h-4 w-4" />
                Escribir por WhatsApp
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {contactInfo.map((info) => {
                const IconComponent = info.icon
                const content = (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {info.title}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{info.content}</p>
                  </>
                )

                return (
                  <div
                    key={info.title}
                    className="flex items-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-700 text-white">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    {info.link ? (
                      <a href={info.link} className="transition hover:text-blue-700">
                        {content}
                      </a>
                    ) : (
                      <div>{content}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </aside>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl sm:p-8 lg:p-10">
            <div className="mb-8 flex items-start justify-between gap-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-950">Enviar consulta</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Completa los datos principales y describe brevemente el trámite o proyecto.
                </p>
              </div>
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 sm:flex">
                <Send className="h-5 w-5" />
              </div>
            </div>

            {submitStatus === 'success' && (
              <div className="mb-6 flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                <p className="text-sm font-semibold text-green-800">
                  {submitMessage}
                </p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">
                  {submitMessage}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-slate-700">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                    className="mt-2 h-12 w-full rounded-md border border-slate-300 px-4 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                    placeholder="Nombre y apellido"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-slate-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    className="mt-2 h-12 w-full rounded-md border border-slate-300 px-4 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                    placeholder="correo@empresa.cl"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="block text-sm font-bold text-slate-700">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                    className="mt-2 h-12 w-full rounded-md border border-slate-300 px-4 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                    placeholder="+56 9 0000 0000"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-bold text-slate-700">
                    Empresa
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    autoComplete="organization"
                    className="mt-2 h-12 w-full rounded-md border border-slate-300 px-4 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                    placeholder="Nombre de la empresa"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-bold text-slate-700">
                  Mensaje *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="mt-2 w-full resize-none rounded-md border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                  placeholder="Cuéntanos el tipo de trámite, ubicación del proyecto, estado actual y cualquier plazo relevante."
                />
              </div>

              {isTurnstileEnabled && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-700">Verificación de seguridad</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Esta validación ayuda a bloquear envíos automáticos y proteger el canal de contacto.
                  </p>
                  <div className="mt-3">
                    <TurnstileWidget onTokenChange={setTurnstileToken} onExpired={() => setTurnstileToken('')} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (isTurnstileEnabled && !turnstileToken)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-6 text-sm font-bold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar mensaje
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-center text-xs leading-5 text-slate-500">
                * Campos obligatorios. Usaremos tus datos solo para responder esta solicitud.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
