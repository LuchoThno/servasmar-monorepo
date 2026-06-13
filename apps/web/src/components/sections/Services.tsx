'use client'

import {
  Anchor,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Leaf,
  Map,
  MessageCircle,
  Radar,
  Shield,
  Ship,
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

const featuredServices = [
  {
    icon: FileText,
    title: 'Tramitación de concesiones marítimas',
    kicker: 'Gestión documental y normativa',
    description:
      'Preparamos, ordenamos y hacemos seguimiento de expedientes para obtener, renovar o regularizar concesiones marítimas.',
    image: '/images/services/concesiones-maritimas.png',
    alt: 'Consultor revisando documentos de concesión marítima con bahía y puerto al fondo',
    features: ['Documentación técnica', 'Gestión ante autoridad marítima', 'Seguimiento del expediente', 'Renovación y regularización'],
  },
  {
    icon: Map,
    title: 'Estudios de líneas de playa',
    kicker: 'Borde costero y territorio',
    description:
      'Levantamos antecedentes técnicos de costa, deslindes y condiciones del terreno para apoyar decisiones y trámites.',
    image: '/images/services/lineas-playa.png',
    alt: 'Especialistas midiendo línea de playa con equipos topográficos en la costa',
    features: ['Levantamiento en terreno', 'Apoyo cartográfico', 'Revisión de antecedentes', 'Informe técnico trazable'],
  },
  {
    icon: Radar,
    title: 'Tecnologías marítimas',
    kicker: 'Datos, monitoreo y operación',
    description:
      'Integramos herramientas de análisis, monitoreo y visualización para proyectos marítimos, portuarios y costeros.',
    image: '/images/services/tecnologias-maritimas.png',
    alt: 'Consultor analizando datos costeros y portuarios en una estación de trabajo marítima',
    features: ['Datos geoespaciales', 'Apoyo a monitoreo', 'Análisis operativo', 'Visualización técnica'],
  },
]

const supportingServices = [
  {
    icon: Ship,
    title: 'Asesoría en proyectos portuarios',
    description: 'Planificación, coordinación y evaluación técnica para iniciativas portuarias.',
  },
  {
    icon: Leaf,
    title: 'Permisos ambientales',
    description: 'Acompañamiento para permisos, compromisos y antecedentes ambientales.',
  },
  {
    icon: Shield,
    title: 'Auditoría y cumplimiento',
    description: 'Revisión de documentación, procesos, riesgos y cumplimiento regulatorio.',
  },
]

const benefits = [
  {
    icon: Shield,
    title: 'Criterio técnico y normativo',
    description: 'Ordenamos antecedentes para reducir fricción con autoridades y clientes.',
  },
  {
    icon: Clock,
    title: 'Seguimiento claro',
    description: 'Priorizamos próximos pasos, responsables y fechas críticas.',
  },
  {
    icon: Award,
    title: 'Trabajo trazable',
    description: 'Cada avance queda documentado para facilitar decisiones y auditorías.',
  },
]

export function Services() {
  const [selectedService, setSelectedService] = useState(0)
  const active = featuredServices[selectedService]
  const ActiveIcon = active.icon

  return (
    <section id="services" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
              <Anchor className="h-4 w-4" />
              Servicios SERVASMAR
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Consultoría marítima para trámites, costa y operación.
            </h2>
          </div>

          <p className="text-lg leading-8 text-slate-600">
            Diseñamos una ruta de trabajo comprensible para cada proyecto: qué antecedentes faltan,
            qué permisos aplican, quién debe resolverlos y cómo avanzar sin perder trazabilidad.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <article key={benefit.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-black text-slate-950">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.description}</p>
              </article>
            )
          })}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="grid gap-3">
            {featuredServices.map((service, index) => {
              const Icon = service.icon
              const isActive = selectedService === index
              return (
                <button
                  key={service.title}
                  type="button"
                  onClick={() => setSelectedService(index)}
                  className={`rounded-lg border p-4 text-left transition ${isActive ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{service.kicker}</p>
                      <h3 className="mt-1 text-base font-black text-slate-950">{service.title}</h3>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="relative min-h-[310px]">
              <Image src={active.image} alt={active.alt} fill className="object-cover" sizes="(min-width: 1024px) 780px, 100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                  <ActiveIcon className="h-4 w-4" />
                  {active.kicker}
                </div>
                <h3 className="max-w-2xl text-2xl font-black">{active.title}</h3>
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.85fr]">
              <p className="text-base leading-7 text-slate-600">{active.description}</p>
              <ul className="grid gap-3">
                {active.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {supportingServices.map((service) => {
            const Icon = service.icon
            return (
              <article key={service.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <Icon className="h-6 w-6 text-blue-700" />
                <h3 className="mt-4 text-lg font-black text-slate-950">{service.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p>
              </article>
            )
          })}
        </div>

        <div className="mt-16 overflow-hidden rounded-lg bg-slate-950 shadow-xl">
          <div className="grid lg:grid-cols-[1fr_0.85fr]">
            <div className="p-8 text-white sm:p-10 lg:p-12">
              <h3 className="text-2xl font-black text-white sm:text-3xl">
                ¿Tienes un proyecto marítimo, portuario o costero con dudas de tramitación?
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Revisamos el caso, identificamos brechas y proponemos una ruta de trabajo para avanzar con mayor certeza.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-black text-blue-800 transition hover:bg-blue-50"
                >
                  Consulta personalizada
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="https://wa.me/56965698527?text=Hola%2C%20necesito%20asesor%C3%ADa%20para%20un%20proyecto%20mar%C3%ADtimo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/30 px-6 text-sm font-black text-white transition hover:bg-white/10"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </div>

            <div className="relative min-h-72 lg:min-h-full">
              <Image src="/images/services/tecnologias-maritimas.png" alt="Análisis de tecnología marítima y datos costeros" fill className="object-cover" sizes="(min-width: 1024px) 480px, 100vw" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
