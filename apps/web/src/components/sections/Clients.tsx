'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const projectSlides = [
  {
    title: 'Infraestructura costera y accesos',
    description:
      'Frentes de obra, ocupación de borde costero y compatibilidad técnica para decisiones que no admiten ambigüedad.',
    image: '/images/carrusel/Screenshot%202026-07-14%20at%2000.07.10.png',
    tag: 'Concesiones y obras',
    meta: 'Diagnóstico, lectura territorial y sustento documental',
    activities: [
      'Revisión de ocupación y compatibilidad del borde costero.',
      'Levantamiento de antecedentes técnicos y documentales.',
      'Definición de ruta regulatoria y estructura del expediente.',
      'Coordinación de observaciones y seguimiento del trámite.',
    ],
  },
  {
    title: 'Operación portuaria y soporte documental',
    description:
      'Contexto operativo para expedientes que deben sostener continuidad, trazabilidad y respuesta frente a revisión sectorial.',
    image: '/images/carrusel/Screenshot%202026-07-14%20at%2000.07.22.png',
    tag: 'Operación portuaria',
    meta: 'Continuidad operacional y control regulatorio',
    activities: [
      'Lectura operativa del proyecto y sus restricciones regulatorias.',
      'Ordenamiento documental para continuidad de operación.',
      'Priorización de riesgos y puntos críticos del expediente.',
      'Seguimiento sectorial y respuesta ante requerimientos.',
    ],
  },
  {
    title: 'Levantamiento técnico en terreno',
    description:
      'Trabajo de campo, antecedentes y estructura técnica para proyectos que necesitan una base más sólida antes de avanzar.',
    image: '/images/carrusel/Screenshot%202026-07-14%20at%2000.08.24.png',
    tag: 'Terreno y antecedentes',
    meta: 'Levantamiento, coordinación y preparación de expediente',
    activities: [
      'Visita y registro técnico en terreno.',
      'Levantamiento topográfico y antecedentes de base.',
      'Integración de información para sustento del proyecto.',
      'Preparación de carpeta técnica para tramitación.',
    ],
  },
  {
    title: 'Entorno marítimo y lectura sectorial',
    description:
      'Comprensión del entorno físico y regulatorio donde se cruzan autoridad marítima, infraestructura y operación.',
    image: '/images/carrusel/Screenshot%202026-07-14%20at%2000.09.43.png',
    tag: 'Contexto marítimo',
    meta: 'Análisis de restricciones y marco sectorial',
    activities: [
      'Identificación de autoridad competente y permisos involucrados.',
      'Análisis del entorno físico y operacional.',
      'Evaluación de restricciones sectoriales relevantes.',
      'Definición de secuencia técnica para avanzar con respaldo.',
    ],
  },
  {
    title: 'Regularización y revisión documental',
    description:
      'Escenarios donde la estructura del expediente, su trazabilidad y la respuesta técnica cambian el resultado del proceso.',
    image: '/images/carrusel/Screenshot%202026-07-14%20at%2000.10.18.png',
    tag: 'Expediente y control',
    meta: 'Regularización, respaldo técnico y seguimiento',
    activities: [
      'Diagnóstico del estado del expediente y sus brechas.',
      'Ordenamiento de respaldos técnicos y administrativos.',
      'Diseño de plan de regularización y ruta de ingreso.',
      'Control de hitos y respuesta a observaciones.',
    ],
  },
  {
    title: 'Lectura operativa del proyecto',
    description:
      'Imágenes que reflejan coordinación entre infraestructura, operación y decisiones regulatorias en curso.',
    image: '/images/carrusel/Screenshot%202026-07-14%20at%2000.10.43.png',
    tag: 'Operación y proyecto',
    meta: 'Coordinación técnica y continuidad operacional',
    activities: [
      'Vinculación entre decisiones operativas y exigencias regulatorias.',
      'Coordinación documental entre áreas técnicas y administrativas.',
      'Lectura de impactos sobre continuidad del proyecto.',
      'Priorización de la siguiente etapa de tramitación.',
    ],
  },
  {
    title: 'Contexto visual de intervención',
    description:
      'Registro del tipo de escenarios que requieren una evaluación completa antes de presentar, corregir o regularizar.',
    image: '/images/carrusel/Screenshot%202026-07-14%20at%2000.12.11.png',
    tag: 'Territorio y análisis',
    meta: 'Evaluación previa y lectura del entorno',
    activities: [
      'Evaluación previa del escenario físico y regulatorio.',
      'Identificación de interferencias o brechas de factibilidad.',
      'Levantamiento de información clave para decidir el ingreso.',
      'Propuesta de hoja de ruta para corregir o presentar.',
    ],
  },
]

export function Clients() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const galleryRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % projectSlides.length)
    }, 6000)

    return () => window.clearInterval(timer)
  }, [])

  const activeSlide = projectSlides[activeIndex]
  const selectedSlide = selectedIndex !== null ? projectSlides[selectedIndex] : null

  const goToPrevious = () => {
    setActiveIndex((current) => (current === 0 ? projectSlides.length - 1 : current - 1))
  }

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % projectSlides.length)
  }

  const scrollGallery = (direction: 'prev' | 'next') => {
    const container = galleryRef.current
    if (!container) return

    const amount = Math.max(container.clientWidth * 0.72, 240)
    container.scrollBy({
      left: direction === 'next' ? amount : -amount,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    if (selectedIndex === null) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedIndex(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedIndex])

  return (
    <>
      <section id="clients" className="py-20 sm:py-24">
        <div className="section-shell">
        <div className="mx-auto max-w-5xl text-center">
          <div className="section-kicker justify-center border-0 pl-0">Proyectos y contexto</div>
          <h2 className="section-title mt-6 text-balance">
            Una muestra visual del tipo de frentes, entornos y decisiones donde intervenimos.
          </h2>
          <p className="section-copy mx-auto mt-6 max-w-4xl">
            Más que listar sectores, esta sección muestra el contexto real de trabajo: infraestructura
            costera, operación, levantamiento técnico y escenarios donde el expediente debe sostenerse bien.
          </p>
        </div>

        <div className="mt-14 rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6 lg:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C6A052]">
              Carrusel de proyectos
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollGallery('prev')}
                aria-label="Ver proyectos anteriores"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-[#0E3048]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollGallery('next')}
                aria-label="Ver más proyectos"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-[#0E3048]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={galleryRef}
            className="mt-5 flex gap-4 overflow-x-auto pb-2 pr-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {projectSlides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => {
                  setActiveIndex(index)
                  setSelectedIndex(index)
                }}
                className={`min-w-[280px] snap-start overflow-hidden rounded-[24px] border transition sm:min-w-[340px] lg:min-w-[360px] ${
                  index === activeIndex
                    ? 'border-[#C6A052] shadow-[0_16px_30px_rgba(15,23,42,0.08)]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="relative h-52 w-full sm:h-60 lg:h-64">
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 360px, 340px"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,26,43,0.04)_0%,rgba(7,26,43,0.1)_45%,rgba(7,26,43,0.78)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-left sm:p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f0d79e]">
                      {slide.tag}
                    </p>
                    <h3 className="mt-2 text-lg font-bold leading-tight text-white sm:text-xl">
                      {slide.title}
                    </h3>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            {projectSlides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ir al proyecto ${index + 1}`}
                className={`h-2 rounded-full transition ${
                  index === activeIndex ? 'w-12 bg-[#C6A052]' : 'w-6 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
        </div>
      </section>

      {selectedSlide && (
        <div className="fixed inset-0 z-[60] bg-[#071A2B]/72 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            <div className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[30px] bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                aria-label="Cerrar detalle del proyecto"
                className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-[#263746] shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition hover:bg-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="grid max-h-[90vh] overflow-y-auto lg:grid-cols-[1.06fr_0.94fr]">
                <div className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-full">
                  <Image
                    src={selectedSlide.image}
                    alt={selectedSlide.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 52vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,26,43,0.02)_0%,rgba(7,26,43,0.14)_44%,rgba(7,26,43,0.86)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <div className="rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f0d79e] backdrop-blur-md w-fit">
                      {selectedSlide.tag}
                    </div>
                    <h3 className="mt-4 max-w-xl text-3xl font-bold leading-tight text-white sm:text-4xl">
                      {selectedSlide.title}
                    </h3>
                  </div>
                </div>

                <div className="p-6 text-[#263746] sm:p-8 lg:p-10">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C6A052]">
                    Actividades del tramite
                  </p>
                  <p className="mt-4 text-base leading-8 text-slate-600">
                    {selectedSlide.description}
                  </p>

                  <div className="mt-8 grid gap-3">
                    {selectedSlide.activities.map((activity, index) => (
                      <div
                        key={activity}
                        className="rounded-[18px] border border-slate-200 bg-slate-50 px-5 py-4"
                      >
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C6A052]">
                          Actividad 0{index + 1}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-700">{activity}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 rounded-[22px] border border-[#ead6ab] bg-[#fff8ea] px-5 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9a7b38]">
                      Alcance
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{selectedSlide.meta}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
