'use client'

import {
  Anchor,
  ArrowRight,
  ArrowUp,
  Clock,
  FileCheck,
  FileText,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const footerSections = [
  {
    title: 'Servicios',
    links: [
      { label: 'Concesiones marítimas', href: '#services' },
      { label: 'Líneas de playa', href: '#services' },
      { label: 'Borde costero', href: '#services' },
      { label: 'Permisos ambientales', href: '#services' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Región del Biobío', href: '#history' },
      { label: 'Desde 2021', href: '#history' },
      { label: 'Actividades', href: '#services' },
      { label: 'Contacto', href: '#contact' },
    ],
  },
]

const contactEmail = 'contacto@servasmar.cl'

const contactItems = [
  {
    icon: Phone,
    label: 'Teléfono',
    value: '+56 9 6569 8527',
    href: 'tel:+56965698527',
  },
  {
    icon: Mail,
    label: 'Email',
    value: contactEmail,
    href: `mailto:${contactEmail}`,
  },
  {
    icon: MapPin,
    label: 'Cobertura',
    value: 'VIII Región del Biobío y Chile',
    href: null,
  },
  {
    icon: Clock,
    label: 'Atención',
    value: 'Lun - Vie: 9:00 - 18:00',
    href: null,
  },
]

const credentials = [
  { icon: ShieldCheck, label: 'Procesos trazables' },
  { icon: FileCheck, label: 'Documentación técnica' },
  { icon: FileText, label: 'Cumplimiento normativo' },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer className="bg-slate-950 text-white">
      <div className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-300">
              Asesoría marítima especializada
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              ¿Necesitas ordenar un trámite, permiso o proyecto costero?
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => scrollToSection('#contact')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-bold text-blue-800 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Solicitar consulta
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/citas"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-cyan-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30"
            >
              Agendar cita
            </Link>
            <a
              href="https://wa.me/56965698527?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20m%C3%A1s%20informaci%C3%B3n%20sobre%20SERVASMAR"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/30 px-6 text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.9fr_1fr]">
          <div>
            <div className="relative h-16 w-56">
              <Image
                src="/images/logo3.png"
                alt="SERVASMAR"
                fill
                className="object-contain object-left brightness-0 invert"
                sizes="224px"
              />
            </div>

            <p className="mt-6 max-w-md text-sm leading-7 text-slate-300">
              SERVASMAR acompaña desde 2021 a empresas y proyectos marítimos de Chile con gestión
              técnica, documental y normativa para avanzar con mayor claridad.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:max-w-xl">
              {credentials.map((credential) => {
                const IconComponent = credential.icon

                return (
                  <div
                    key={credential.label}
                    className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <IconComponent className="h-4 w-4 shrink-0 text-cyan-300" />
                    <span className="text-xs font-semibold text-slate-200">{credential.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-white">{section.title}</h3>
                <ul className="mt-5 space-y-3">
                  {section.links.map((link) => (
                    <li key={`${section.title}-${link.label}`}>
                      <button
                        type="button"
                        onClick={() => scrollToSection(link.href)}
                        className="text-left text-sm text-slate-300 transition hover:text-cyan-300 focus:outline-none focus:text-cyan-300"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">Contacto</h3>
            <div className="mt-5 grid gap-4">
              {contactItems.map((item) => {
                const IconComponent = item.icon
                const content = (
                  <>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-slate-100">{item.value}</span>
                  </>
                )

                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/10 text-cyan-300">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    {item.href ? (
                      <a href={item.href} className="transition hover:text-cyan-300">
                        {content}
                      </a>
                    ) : (
                      <div>{content}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            © {currentYear} SERVASMAR. Todos los derechos reservados.
          </p>

          <div className="flex items-center gap-3">
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn de SERVASMAR"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-slate-300 transition hover:border-cyan-300 hover:text-cyan-300"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Volver arriba"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 px-4 text-sm font-bold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-300 focus:outline-none focus:ring-4 focus:ring-white/10"
            >
              Arriba
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
