'use client'

import {
  Anchor,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Leaf,
  MessageCircle,
  Scale,
  Shield,
  Ship,
  Waves,
} from 'lucide-react'
import { useState } from 'react'

const services = [
  {
    icon: FileText,
    title: 'Tramitación de Concesiones Marítimas',
    description:
      'Gestión documental, técnica y administrativa para obtener, renovar o regularizar concesiones marítimas.',
    features: [
      'Preparación de documentación técnica',
      'Gestión ante autoridades marítimas',
      'Seguimiento del expediente',
      'Renovación y regularización de concesiones',
    ],
    featured: true,
  },
  {
    icon: Leaf,
    title: 'Gestión de Permisos Ambientales',
    description:
      'Asesoría para proyectos marítimos y portuarios que requieren permisos, evaluaciones y seguimiento ambiental.',
    features: [
      'Evaluación de impacto ambiental',
      'Estudios de sostenibilidad',
      'Tramitación de permisos y declaraciones',
      'Seguimiento de compromisos ambientales',
    ],
    featured: false,
  },
  {
    icon: Ship,
    title: 'Asesoría en Proyectos Portuarios',
    description:
      'Consultoría para planificar, coordinar y ejecutar iniciativas portuarias con criterio técnico y normativo.',
    features: [
      'Planificación estratégica',
      'Viabilidad técnica y económica',
      'Coordinación con actores clave',
      'Gestión integral del proyecto',
    ],
    featured: false,
  },
  {
    icon: Scale,
    title: 'Consultoría Legal Marítima',
    description:
      'Apoyo jurídico especializado para contratos, cumplimiento normativo y resolución de materias marítimas.',
    features: [
      'Contratos marítimos',
      'Resolución de conflictos',
      'Compliance normativo',
      'Representación y acompañamiento legal',
    ],
    featured: true,
  },
  {
    icon: FileCheck,
    title: 'Auditorías y Certificaciones',
    description:
      'Revisión de cumplimiento y preparación de antecedentes para auditorías, inspecciones y certificaciones.',
    features: [
      'Auditorías de cumplimiento',
      'Certificaciones ISO',
      'Inspecciones técnicas',
      'Informes de conformidad',
    ],
    featured: false,
  },
  {
    icon: Waves,
    title: 'Gestión Portuaria Integral',
    description:
      'Soluciones operativas y administrativas para instalaciones marítimas, portuarias y costeras.',
    features: [
      'Optimización de operaciones',
      'Gestión de recursos',
      'Mantenimiento de instalaciones',
      'Protocolos de seguridad',
    ],
    featured: false,
  },
]

const benefits = [
  {
    icon: Shield,
    title: 'Experiencia comprobada',
    description: 'Más de 20 años asesorando proyectos marítimos.',
  },
  {
    icon: Clock,
    title: 'Respuesta ágil',
    description: 'Acompañamiento claro desde el primer contacto.',
  },
  {
    icon: Award,
    title: 'Trabajo documentado',
    description: 'Procesos ordenados, trazables y orientados a cumplimiento.',
  },
]

export function Services() {
  const [selectedService, setSelectedService] = useState<number | null>(0)

  return (
    <section id="services" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
              <Anchor className="h-4 w-4" />
              Servicios especializados
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Soluciones marítimas para proyectos que necesitan avanzar bien.
            </h2>
          </div>

          <p className="text-lg leading-8 text-slate-600">
            Acompañamos trámites, permisos, auditorías y proyectos portuarios con una mirada técnica,
            legal y operativa. El objetivo es simple: ordenar el proceso, reducir fricción y cuidar el
            cumplimiento desde el inicio.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {benefits.map((benefit) => {
            const IconComponent = benefit.icon

            return (
              <article
                key={benefit.title}
                className="flex min-h-32 items-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-700 text-white">
                  <IconComponent className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">{benefit.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{benefit.description}</p>
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => {
            const IconComponent = service.icon
            const isExpanded = selectedService === index
            const detailsId = `service-details-${index}`

            return (
              <article
                key={service.title}
                className="group flex min-h-[390px] flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-900 text-white transition duration-300 group-hover:bg-blue-700">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  {service.featured && (
                    <span className="rounded-md bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-800">
                      Frecuente
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold leading-7 text-slate-950">{service.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p>

                <div
                  id={detailsId}
                  className={`mt-5 overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'max-h-56 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <ul className="space-y-3 border-t border-slate-100 pt-5">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isExpanded ? (
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-900 transition duration-300 hover:border-blue-700 hover:bg-blue-700 hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                    aria-controls={detailsId}
                    aria-expanded="true"
                  >
                    Ocultar detalles
                    <ArrowRight className="h-4 w-4 rotate-90 transition-transform duration-300" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedService(index)}
                    className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-900 transition duration-300 hover:border-blue-700 hover:bg-blue-700 hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                    aria-controls={detailsId}
                    aria-expanded="false"
                  >
                    Ver detalles
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                )}
              </article>
            )
          })}
        </div>

        <div className="mt-16 overflow-hidden rounded-lg bg-slate-950 shadow-xl">
          <div className="grid lg:grid-cols-[1fr_0.8fr]">
            <div className="p-8 text-white sm:p-10 lg:p-12">
              <h3 className="text-2xl font-bold text-white sm:text-3xl">
                ¿No encuentras el servicio que necesitas?
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                También desarrollamos soluciones a medida para proyectos marítimos, portuarios y
                costeros con requerimientos específicos.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-bold text-blue-800 transition duration-300 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/20"
                >
                  Consulta personalizada
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="https://wa.me/56965698527?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20servicios%20mar%C3%ADtimos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/30 px-6 text-sm font-bold text-white transition duration-300 hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </div>

            <div
              className="min-h-64 bg-[url('/images/banner.png')] bg-cover bg-center lg:min-h-full"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
