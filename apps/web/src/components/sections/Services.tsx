'use client'

import { Anchor, ArrowRight, CheckCircle2, FileText, Leaf, Map, Radar, Ship, Waves } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const activities = [
  {
    icon: FileText,
    title: 'Concesiones marítimas',
    description: 'Preparación, revisión y seguimiento de antecedentes para solicitudes, renovaciones o regularizaciones.',
    image: '/images/services/concesiones-maritimas.png',
    alt: 'Revisión documental para concesiones marítimas frente a una bahía',
  },
  {
    icon: Map,
    title: 'Líneas de playa y borde costero',
    description: 'Apoyo técnico para levantamientos, revisión de ubicación, deslindes y antecedentes territoriales.',
    image: '/images/services/lineas-playa.png',
    alt: 'Levantamiento técnico en playa con equipos topográficos',
  },
  {
    icon: Radar,
    title: 'Tecnología y análisis marítimo',
    description: 'Uso de datos, cartografía y visualización para entender condiciones de costa, operación y proyecto.',
    image: '/images/services/tecnologias-maritimas.png',
    alt: 'Análisis de información marítima y portuaria en estación técnica',
  },
]

const supportAreas = [
  { icon: Ship, label: 'Proyectos portuarios' },
  { icon: Leaf, label: 'Permisos ambientales' },
  { icon: Waves, label: 'Actividad costera' },
  { icon: Anchor, label: 'Gestión ante autoridad' },
]

const steps = [
  'Revisamos el caso y el estado de los antecedentes.',
  'Definimos una ruta de gestión con prioridades y responsables.',
  'Acompañamos el avance documental hasta dejar próximos pasos claros.',
]

export function Services() {
  return (
    <section id="services" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-md border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-800">
              <Anchor className="h-4 w-4" />
              Actividades
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Lo esencial para mover proyectos marítimos con orden.
            </h2>
          </div>

          <p className="text-lg leading-8 text-slate-600">
            Una página más limpia también debe explicar mejor. Estas son las áreas donde SERVASMAR
            aporta valor: trámites, territorio, cumplimiento y apoyo técnico para tomar decisiones.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {activities.map((activity) => {
            const Icon = activity.icon

            return (
              <article key={activity.title} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="relative h-56">
                  <Image src={activity.image} alt={activity.alt} fill className="object-cover" sizes="(min-width: 1024px) 390px, 100vw" />
                </div>
                <div className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-700 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-slate-950">{activity.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{activity.description}</p>
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg bg-slate-950 p-6 text-white sm:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-300">Apoyo complementario</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {supportAreas.map((area) => {
                const Icon = area.icon

                return (
                  <div key={area.label} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4">
                    <Icon className="h-5 w-5 text-cyan-300" />
                    <span className="text-sm font-bold text-slate-100">{area.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Cómo trabajamos</p>
            <ul className="mt-5 grid gap-4">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-sm font-black text-blue-700">
                    {index + 1}
                  </div>
                  <div className="flex items-start gap-3 text-sm font-semibold leading-6 text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" />
                    <span>{step}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-blue-700 px-6 text-sm font-black text-white transition hover:bg-blue-800"
              >
                Consultar por un proyecto
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/citas"
                className="inline-flex h-12 items-center justify-center rounded-md border border-slate-300 px-6 text-sm font-black text-slate-800 transition hover:border-blue-700 hover:text-blue-700"
              >
                Agendar reunión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
