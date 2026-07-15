'use client'

import { ArrowRight, FileCheck2, Leaf, Scale, Ship, Waves } from 'lucide-react'

const primaryServices = [
  {
    title: 'Concesiones marítimas',
    description:
      'Estructuramos solicitudes, renovaciones, modificaciones y regularizaciones con mejor control del expediente y sus hitos.',
    icon: Waves,
  },
  {
    title: 'Permisos ambientales',
    description:
      'Identificamos exigencias, brechas y estudios necesarios para que la ruta regulatoria sea técnicamente sostenible.',
    icon: Leaf,
  },
  {
    title: 'Proyectos portuarios e infraestructura',
    description:
      'Acompañamos decisiones de expansión, habilitación u operación con criterio técnico, documental y sectorial.',
    icon: Ship,
  },
]

const additionalServices = [
  'Consultoría legal marítima aplicada a cumplimiento y contingencias',
  'Auditorías documentales y preparación para inspecciones técnicas',
  'Regularización de infraestructura existente en borde costero',
]

const executiveOutcomes = [
  'Menor exposición regulatoria',
  'Mejor trazabilidad documental',
  'Mayor claridad para decidir la siguiente etapa',
]

export function Services() {
  return (
    <section id="services" className="py-20 sm:py-24">
      <div className="section-shell">
        <div className="mx-auto max-w-5xl text-center">
          <div className="section-kicker justify-center border-0 pl-0">Capacidades clave</div>
          <h2 className="section-title mt-6 text-balance">
            Capacidades técnicas orientadas a destrabar, ordenar y sostener proyectos costeros complejos.
          </h2>
          <p className="section-copy mt-6">
            No operamos como un catálogo de trámites. Organizamos el trabajo según los frentes que
            determinan la viabilidad del proyecto y la solidez de su expediente.
          </p>
        </div>

        <div className="section-panel mt-14 overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="bg-[#071A2B] p-8 text-white sm:p-10 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C6A052]">
                Frentes prioritarios
              </p>

              <div className="mt-8 grid gap-4">
                {primaryServices.map((service) => {
                  const IconComponent = service.icon

                  return (
                    <article
                      key={service.title}
                      className="rounded-[24px] border border-white/10 bg-white/5 p-6 sm:p-7"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#C6A052] text-[#071A2B]">
                          <IconComponent className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="text-xl font-bold text-white sm:text-2xl">{service.title}</h3>
                          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/74 sm:text-[15px]">
                            {service.description}
                          </p>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            <div className="bg-white p-8 text-[#263746] sm:p-10 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Alcance complementario
              </p>
              <h3 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
                Un mismo proyecto puede exigir varias capas de soporte.
              </h3>
              <p className="mt-6 text-base leading-8 text-slate-600">
                Integramos apoyo regulatorio, técnico y documental para que cada frente avance con
                mayor coherencia y menos retrabajo.
              </p>

              <div className="mt-8 grid gap-3">
                {additionalServices.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4F1E9] text-[#0E3048]">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium leading-7 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-[24px] border border-[#d7c39a] bg-[#f8f2e6] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7b38]">
                  Resultado ejecutivo
                </p>
                <div className="mt-4 grid gap-3">
                  {executiveOutcomes.map((outcome) => (
                    <div key={outcome} className="flex items-center gap-3 text-sm font-semibold text-[#3d4350]">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#9a7b38]">
                        <FileCheck2 className="h-4 w-4" />
                      </div>
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
