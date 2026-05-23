'use client'

import {
  Anchor,
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Factory,
  Fish,
  Quote,
  Sailboat,
  ShieldCheck,
  Ship,
  Star,
  TrendingUp,
  Users,
  Waves,
  Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const clientStories = [
  {
    name: 'Terminal Portuario del Pacífico',
    industry: 'Puertos y terminales',
    icon: Anchor,
    testimonial:
      'SERVASMAR ordenó el proceso técnico y documental de nuestra concesión, manteniendo una comunicación clara con cada actor involucrado.',
    project: 'Regularización de concesión marítima',
    result: 'Expediente completo y trazable',
  },
  {
    name: 'Acuícola Bahía Sur',
    industry: 'Pesca y acuicultura',
    icon: Fish,
    testimonial:
      'El acompañamiento ambiental fue preciso y práctico. Pudimos responder observaciones con respaldo técnico y dentro de los plazos.',
    project: 'Permisos ambientales y seguimiento',
    result: 'Observaciones respondidas a tiempo',
  },
  {
    name: 'Marina Costera Norte',
    industry: 'Turismo náutico',
    icon: Sailboat,
    testimonial:
      'Necesitábamos claridad normativa para ampliar instalaciones. El equipo nos ayudó a tomar decisiones con información concreta.',
    project: 'Ampliación de infraestructura costera',
    result: 'Ruta normativa definida',
  },
]

const stats = [
  { number: '150+', label: 'clientes acompañados', icon: Users },
  { number: '500+', label: 'gestiones completadas', icon: Award },
  { number: '98%', label: 'continuidad de clientes', icon: TrendingUp },
  { number: '20+', label: 'años de experiencia', icon: Star },
]

const industries = [
  { name: 'Puertos y terminales', description: 'Concesiones, operación y cumplimiento.', icon: Anchor },
  { name: 'Transporte marítimo', description: 'Gestión documental y apoyo regulatorio.', icon: Ship },
  { name: 'Pesca y acuicultura', description: 'Permisos, auditorías y seguimiento.', icon: Fish },
  { name: 'Industria costera', description: 'Proyectos productivos en borde costero.', icon: Factory },
  { name: 'Turismo náutico', description: 'Marinas, instalaciones y servicios.', icon: Sailboat },
  { name: 'Servicios técnicos', description: 'Inspecciones, certificaciones y reportes.', icon: Wrench },
]

const trustSignals = [
  'Comunicación directa con responsables técnicos',
  'Documentación preparada para revisión de autoridad',
  'Seguimiento por hitos y trazabilidad del expediente',
]

export function Clients() {
  const [currentStory, setCurrentStory] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentStory((prev) => (prev + 1) % clientStories.length)
    }, 7000)

    return () => window.clearInterval(interval)
  }, [])

  const activeStory = clientStories[currentStory]
  const StoryIcon = activeStory.icon

  return (
    <section id="clients" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-800">
              <Building2 className="h-4 w-4" />
              Clientes y sectores
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Relaciones de confianza con empresas del mundo marítimo.
            </h2>
          </div>

          <p className="text-lg leading-8 text-slate-600">
            Trabajamos con organizaciones que necesitan avanzar con orden, criterio técnico y
            cumplimiento normativo: operadores portuarios, industrias costeras, acuícolas, marinas y
            equipos de proyectos.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const IconComponent = stat.icon

            return (
              <article
                key={stat.label}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <IconComponent className="h-6 w-6 text-blue-700" />
                <p className="mt-5 text-3xl font-bold text-slate-950">{stat.number}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{stat.label}</p>
              </article>
            )
          })}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-700 text-white">
                <Quote className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                  Caso destacado
                </p>
                <h3 className="text-xl font-bold text-slate-950">{activeStory.project}</h3>
              </div>
            </div>

            <blockquote className="mt-8 text-xl font-medium leading-9 text-slate-800">
              “{activeStory.testimonial}”
            </blockquote>

            <div className="mt-8 flex items-start gap-4 border-t border-slate-100 pt-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                <StoryIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-950">{activeStory.name}</p>
                <p className="text-sm text-slate-600">{activeStory.industry}</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">
                  <CheckCircle2 className="h-4 w-4" />
                  {activeStory.result}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-2" aria-label="Seleccionar caso destacado">
              {clientStories.map((story, index) => {
                const isActive = index === currentStory

                return isActive ? (
                  <button
                    key={story.name}
                    type="button"
                    onClick={() => setCurrentStory(index)}
                    className="h-2.5 w-8 rounded-full bg-blue-700"
                    aria-label={`Caso actual: ${story.name}`}
                  />
                ) : (
                  <button
                    key={story.name}
                    type="button"
                    onClick={() => setCurrentStory(index)}
                    className="h-2.5 w-2.5 rounded-full bg-slate-300 transition hover:bg-slate-400"
                    aria-label={`Ver caso de ${story.name}`}
                  />
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {industries.map((industry) => {
              const IconComponent = industry.icon

              return (
                <article
                  key={industry.name}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-blue-700">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-950">{industry.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{industry.description}</p>
                </article>
              )
            })}
          </div>
        </div>

        <div className="mt-16 overflow-hidden rounded-lg bg-slate-950 shadow-xl">
          <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="bg-[url('/images/banner.png')] bg-cover bg-center p-8 sm:p-10 lg:p-12">
              <div className="max-w-sm rounded-lg bg-slate-950/85 p-6 text-white backdrop-blur">
                <ShieldCheck className="h-10 w-10 text-cyan-300" />
                <h3 className="mt-5 text-2xl font-bold text-white">
                  Criterio técnico para decisiones sensibles.
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Acompañamos gestiones donde los plazos, permisos y antecedentes deben estar bien
                  coordinados.
                </p>
              </div>
            </div>

            <div className="p-8 text-white sm:p-10 lg:p-12">
              <div className="grid gap-4">
                {trustSignals.map((signal) => (
                  <div key={signal} className="flex items-start gap-3 rounded-lg border border-white/10 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                    <p className="text-sm leading-6 text-slate-200">{signal}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-bold text-blue-800 transition duration-300 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/20"
                >
                  Solicitar consulta
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/30 px-6 text-sm font-bold text-white transition duration-300 hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
                >
                  Ver servicios
                  <Waves className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
