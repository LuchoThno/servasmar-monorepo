'use client'

import { ArrowUpRight, Mail, MapPin } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const links = [
  { label: 'Inicio', href: '#hero' },
  { label: 'Proceso', href: '#process' },
  { label: 'Proyectos', href: '#clients' },
  { label: 'Contacto', href: '#contact' },
]

const contact = [
  { label: 'Correo', value: 'contacto@servasmar.cl', href: 'mailto:contacto@servasmar.cl', icon: Mail },
  { label: 'Cobertura', value: 'Atención en todo Chile', href: null, icon: MapPin },
]

export function Footer() {
  const scrollToSection = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer className="mt-8 bg-[#071A2B] text-white">
      <div className="border-t border-white/10">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="relative h-16 w-56 sm:h-20 sm:w-72">
                <Image
                  src="/images/logo3.png"
                  alt="SERVASMAR"
                  fill
                  className="object-contain object-left brightness-0 invert drop-shadow-[0_8px_28px_rgba(0,0,0,0.18)]"
                  sizes="288px"
                />
              </div>

              <p className="mt-8 text-sm font-bold uppercase tracking-[0.26em] text-[#C6A052]">
                Consultoría marítima y costera
              </p>
              <h2 className="mt-5 max-w-xl text-4xl font-bold leading-tight text-white sm:text-5xl">
                Decisiones costeras mejor estructuradas antes de comprometer operación o inversión.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#AAB5C0]">
                SERVASMAR acompaña expedientes, permisos, regularizaciones e infraestructura costera
                con una gestión técnica, documental y regulatoria diseñada para reducir fricción y
                elevar la calidad de cada decisión.
              </p>

              <Link
                href="/citas"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#C6A052] px-6 py-4 text-sm font-bold uppercase tracking-[0.08em] text-[#071A2B] transition hover:bg-white"
              >
                Agendar evaluación
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-10 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Navegación
                </p>
                <div className="mt-5 grid gap-3">
                  {links.map((link) => (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => scrollToSection(link.href)}
                      className="text-left text-base font-bold text-white/82 transition hover:text-[#C6A052]"
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Contacto
                </p>
                <div className="mt-5 grid gap-4">
                  {contact.map((item) => {
                    const IconComponent = item.icon
                    const content = (
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-white/88">{item.value}</p>
                      </div>
                    )

                    return (
                      <div key={item.label} className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#C6A052]">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        {item.href ? (
                          <a href={item.href} className="transition hover:text-[#C6A052]">
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
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-slate-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p>
              © {new Date().getFullYear()} SERVASMAR. Concesiones marítimas, permisos y proyectos de
              infraestructura costera en Chile.
            </p>
            <a
              href="https://github.com/LuchoThno"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-300 transition hover:text-[#C6A052]"
            >
              Creado ❤️ por LuchoThno Software Engineer
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
