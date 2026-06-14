'use client'

import { ArrowRight, CheckCircle2, FileText, Map, Waves } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const proofPoints = [
  'Empresa chilena fundada en 2021',
  'Base en la Región del Biobío',
  'Gestión técnica y documental',
]

const servicePills = [
  { icon: FileText, label: 'Concesiones y permisos' },
  { icon: Map, label: 'Borde costero' },
  { icon: Waves, label: 'Operación marítima' },
]

export function Hero() {
  const scrollToServices = () => {
    document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero" className="relative min-h-screen overflow-hidden bg-slate-950">
      <Image
        src="/images/services/concesiones-maritimas.png"
        alt="Consultor marítimo revisando documentación técnica de concesiones frente a una bahía"
        fill
        className="object-cover object-center"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/72 to-slate-950/25" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 pb-16 pt-32 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-cyan-100 backdrop-blur">
            Consultoría marítima desde la Región del Biobío
          </div>

          <h1 className="mt-7 max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Ordenamos trámites y proyectos marítimos para empresas de Chile.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            SERVASMAR acompaña concesiones, permisos sectoriales, estudios de borde costero y documentación técnica con una forma de trabajo clara, cercana y trazable.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={scrollToServices}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-blue-600 px-6 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Ver actividades
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/citas"
              className="inline-flex h-12 items-center justify-center rounded-md border border-white/30 bg-white/10 px-6 text-sm font-black text-white backdrop-blur transition hover:bg-white hover:text-slate-950"
            >
              Agendar reunión
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {servicePills.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur">
                  <Icon className="h-4 w-4 text-cyan-200" />
                  {item.label}
                </div>
              )
            })}
          </div>

          <ul className="mt-8 grid gap-3 text-sm font-semibold text-slate-200 sm:grid-cols-3">
            {proofPoints.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
