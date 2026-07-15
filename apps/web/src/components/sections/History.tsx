'use client'

const pillars = [
  {
    title: 'Concesiones y permisos',
    description:
      'Solicitudes, renovaciones, modificaciones y transferencias bajo una estructura documental consistente.',
  },
  {
    title: 'Ingeniería y topografía',
    description:
      'Levantamientos, representación técnica y antecedentes territoriales para sustentar definiciones del proyecto.',
  },
  {
    title: 'Gestión ambiental',
    description:
      'Identificación de exigencias, coordinación de estudios y soporte para permisos sectoriales vinculados.',
  },
  {
    title: 'Regularización costera',
    description:
      'Diagnóstico y normalización de infraestructura existente con criterio técnico, administrativo y regulatorio.',
  },
]

const expertiseSignals = [
  'Estructura documental',
  'Lectura regulatoria',
  'Coordinación técnica',
  'Continuidad del expediente',
]

export function History() {
  return (
    <section id="experience" className="py-20 sm:py-24">
      <div className="section-shell">
        <div className="mx-auto max-w-5xl text-center">
          <div className="section-kicker justify-center border-0 pl-0">Especialización SERVASMAR</div>
          <h2 className="section-title mt-6 text-balance">
            Una sola gestión para ordenar los frentes que suelen trabar un proyecto costero.
          </h2>
          <p className="section-copy mt-6">
            Integramos análisis técnico, lectura normativa, variables ambientales y control
            documental para que la tramitación no dependa de esfuerzos dispersos o decisiones
            incompletas.
          </p>
        </div>

        <div className="mt-14 rounded-[30px] border border-[#d8dee6] bg-white p-8 sm:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C6A052]">
                Cómo intervenimos
              </p>
              <h3 className="mt-5 text-3xl font-bold leading-tight text-[#263746] sm:text-4xl">
                Transformamos complejidad regulatoria en una hoja de trabajo gobernable.
              </h3>
              <p className="mt-6 text-base leading-8 text-slate-600">
                En lugar de abordar cada trámite por separado, consolidamos los antecedentes que
                condicionan su factibilidad, la consistencia del expediente y la capacidad de
                respuesta frente a revisión sectorial.
              </p>

              <div className="mt-8 grid gap-3">
                {expertiseSignals.map((item) => (
                  <div
                    key={item}
                    className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {pillars.map((pillar, index) => (
                <article
                  key={pillar.title}
                  className={`rounded-[24px] border p-6 sm:p-7 ${
                    index === 0
                      ? 'border-[#0E3048] bg-[#0E3048] text-white'
                      : 'border-slate-200 bg-[#fbfcfd] text-[#263746]'
                  }`}
                >
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#C6A052]">
                    0{index + 1}
                  </div>
                  <h3 className={`mt-4 text-xl font-bold ${index === 0 ? 'text-white' : 'text-[#263746]'}`}>
                    {pillar.title}
                  </h3>
                  <p className={`mt-3 text-sm leading-7 ${index === 0 ? 'text-white/76' : 'text-slate-600'}`}>
                    {pillar.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
