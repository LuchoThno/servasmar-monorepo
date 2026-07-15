'use client'

import { AlertCircle, CheckCircle2, ExternalLink, FileText, Shield, Waves } from 'lucide-react'
import Image from 'next/image'

const processSteps = [
  'Evaluación inicial',
  'Revisión de antecedentes',
  'Levantamiento en terreno',
  'Definición de permisos y estudios',
  'Desarrollo del expediente',
  'Presentación y tramitación',
  'Respuesta a observaciones',
  'Acompañamiento hasta su resolución',
]

const frameworks = [
  {
    title: 'Concesiones y borde costero',
    description: 'Uso, ocupación y administración de espacios marítimos y costeros.',
    icon: Waves,
    link: 'https://www.bcn.cl/leychile/navegar?idNorma=30785',
  },
  {
    title: 'Autoridad marítima',
    description: 'Coordinación con DIRECTEMAR, DGTM y otros organismos sectoriales.',
    icon: Shield,
    link: 'https://www.directemar.cl',
  },
  {
    title: 'Normativa técnica',
    description: 'Estándares y exigencias que impactan operación, seguridad y cumplimiento.',
    icon: FileText,
    link: 'https://www.imo.org/en/About/Conventions/Pages/SOLAS.aspx',
  },
]

export function Regulations() {
  return (
    <section id="process" className="py-20 sm:py-24">
      <div className="section-shell">
        <div className="section-panel overflow-hidden bg-[#071A2B] text-white">
          <div className="grid gap-0 lg:grid-cols-[0.98fr_1.02fr]">
            <div className="p-8 sm:p-10 lg:p-14">
              <div className="section-kicker border-[#C6A052] pl-4 text-white/78">
                Proceso y marco técnico
              </div>
              <h2 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                Del diagnóstico a la aprobación.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#AAB5C0] sm:text-lg">
                Acompañamos el proceso hasta su resolución, definiendo el alcance técnico y
                regulatorio según la realidad de cada concesión, permiso, modificación o
                regularización.
              </p>

              <div className="mt-10 grid gap-4">
                {processSteps.map((step, index) => (
                  <div
                    key={step}
                    className="grid grid-cols-[auto_1fr] items-start gap-4 rounded-[22px] border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C6A052] text-xs font-bold text-[#071A2B]">
                      0{index + 1}
                    </span>
                    <p className="pt-2 text-sm font-medium leading-6 text-white/86">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#C6A052]" />
                  <p className="text-sm leading-7 text-white/82">
                    El alcance específico depende del proyecto. No prometemos aprobaciones
                    garantizadas; estructuramos expedientes sólidos y acompañamos su tramitación con
                    criterio técnico.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0B2236] p-8 sm:p-10 lg:p-12">
              <div className="overflow-hidden rounded-[28px] border border-white/10">
                <div className="relative h-[320px] sm:h-[420px]">
                  <Image
                    src="/images/maritime-flow.png"
                    alt="Flujo de trabajo para proyectos marítimos y costeros"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071A2B]/78 via-transparent to-transparent" />
                </div>
              </div>

              <div className="mt-8 grid gap-4">
                {frameworks.map((framework) => {
                  const IconComponent = framework.icon

                  return (
                    <article
                      key={framework.title}
                      className="rounded-[22px] border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C6A052] text-[#071A2B]">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{framework.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-[#AAB5C0]">{framework.description}</p>
                          <a
                            href={framework.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-[#C6A052]"
                          >
                            Revisar fuente
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="mt-8 rounded-[22px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#C6A052]" />
                  <p className="text-sm leading-7 text-white/82">
                    Integramos normativa marítima, topografía, antecedentes técnicos, variables
                    ambientales y orden documental en una sola hoja de ruta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
