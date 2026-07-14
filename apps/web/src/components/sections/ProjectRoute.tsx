'use client'

import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  FolderKanban,
  Leaf,
  MapPinned,
  Ruler,
  ShieldCheck,
} from 'lucide-react'

const routeSteps = [
  {
    number: '01',
    title: 'Diagnóstico inicial',
    description:
      'Revisamos la factibilidad del proyecto, el estado de los antecedentes y el marco normativo aplicable.',
    icon: FileCheck2,
  },
  {
    number: '02',
    title: 'Topografía y antecedentes',
    description:
      'Levantamos la base técnica, territorial y documental que sustenta el expediente y sus definiciones.',
    icon: Ruler,
  },
  {
    number: '03',
    title: 'Evaluación ambiental',
    description:
      'Determinamos exigencias sectoriales, estudios requeridos y brechas ambientales que deben resolverse.',
    icon: Leaf,
  },
  {
    number: '04',
    title: 'Expediente marítimo',
    description:
      'Estructuramos la documentación técnica, legal y administrativa para una presentación sólida.',
    icon: FolderKanban,
  },
  {
    number: '05',
    title: 'Revisión sectorial',
    description:
      'Coordinamos presentación, seguimiento y respuesta a observaciones ante los organismos competentes.',
    icon: Building2,
  },
  {
    number: '06',
    title: 'Resolución y regularización',
    description:
      'Acompañamos el cierre del proceso hasta la resolución y la correcta regularización del proyecto.',
    icon: BadgeCheck,
    featured: true,
  },
]

const trustItems = [
  { label: 'Metodología técnica comprobada', icon: ShieldCheck },
  { label: 'Acompañamiento integral', icon: CheckCircle2 },
  { label: 'Gestión documental especializada', icon: FolderKanban },
  { label: 'Cobertura nacional', icon: MapPinned },
]

export function ProjectRoute() {
  return (
    <section id="process" className="py-20 sm:py-24">
      <div className="section-shell">
        <div className="mx-auto max-w-5xl text-center">
          <div className="section-kicker justify-center border-0 pl-0">Ruta del proyecto</div>
          <h2 className="section-title mt-6 text-balance">
            Una metodología clara para ordenar decisiones, expediente y tramitación.
          </h2>
          <p className="section-copy mt-6">
            SERVASMAR integra criterios técnicos, regulatorios, ambientales y documentales en una
            secuencia de trabajo que permite avanzar con mayor control y menor exposición.
          </p>
        </div>

        <div className="section-panel mt-14 overflow-hidden bg-[#071A2B] text-white">
          <div className="px-7 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <div className="grid gap-5 lg:grid-cols-2">
              {routeSteps.map((step) => {
                const IconComponent = step.icon

                return (
                  <article
                    key={step.number}
                    className={`rounded-[24px] border p-6 sm:p-7 ${
                      step.featured
                        ? 'border-[#C6A052] bg-[#13324d]'
                        : 'border-white/8 bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#C6A052] text-sm font-bold text-[#071A2B]">
                        {step.number}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B2236] text-[#C6A052]">
                            <IconComponent aria-hidden="true" className="h-5 w-5" />
                          </div>
                          <h3 className="text-xl font-bold text-white sm:text-2xl">{step.title}</h3>
                        </div>

                        <p className="mt-4 text-sm leading-7 text-[#B6C2CE] sm:text-[15px]">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="mt-10 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-2 xl:grid-cols-4">
              {trustItems.map((item) => {
                const IconComponent = item.icon

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/5 px-4 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0E3048] text-[#C6A052]">
                      <IconComponent aria-hidden="true" className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold leading-6 text-white/82">{item.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
