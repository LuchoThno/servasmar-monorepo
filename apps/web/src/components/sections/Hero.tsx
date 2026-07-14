'use client'

import { BadgeCheck } from 'lucide-react'

const trustSignals = [
  'Concesiones marítimas y regularización costera',
  'Soporte técnico, ambiental y documental',
  'Cobertura en Chile',
]

export function Hero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-24 sm:pt-28"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(7, 26, 43, 0.92) 0%, rgba(7, 26, 43, 0.84) 38%, rgba(7, 26, 43, 0.56) 100%), url('/images/hero-concessions.png')",
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(198,160,82,0.14),transparent_20%),linear-gradient(180deg,rgba(0,0,0,0)_70%,rgba(7,26,43,0.28)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f6f8fb] to-transparent" />

      <div className="section-shell relative z-10 flex min-h-[70svh] flex-col justify-center pb-20 pt-12 sm:min-h-[76svh] sm:pb-24 sm:pt-16 lg:min-h-[82svh]">
        <div className="max-w-5xl text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#c6a052] backdrop-blur-md">
            <BadgeCheck aria-hidden="true" className="h-4 w-4" />
            SERVASMAR
          </div>

          <h1 className="mt-8 max-w-5xl text-balance text-5xl font-extrabold leading-[1.01] text-white sm:text-6xl lg:text-[78px]">
            Consultoría marítima para decisiones que exigen respaldo técnico y control regulatorio.
          </h1>

          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/74 sm:text-xl">
            Acompañamos concesiones, permisos, regularizaciones e infraestructura costera con una
            gestión rigurosa, ordenada y orientada a reducir fricción frente a la autoridad.
          </p>
        </div>

        <div className="mt-14 grid gap-4 border-t border-white/10 pt-7 lg:grid-cols-3">
          {trustSignals.map((item) => (
            <div
              key={item}
              className="rounded-[18px] bg-[#c6a052]/10 px-5 py-4 text-sm font-semibold leading-6 text-[#e3c98f] backdrop-blur-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
