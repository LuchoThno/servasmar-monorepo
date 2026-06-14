'use client'

import { Anchor, CheckCircle2, Compass, MapPin, ShieldCheck } from 'lucide-react'
import Image from 'next/image'

const facts = [
  { label: 'Inicio', value: '2021' },
  { label: 'Base', value: 'Región del Biobío' },
  { label: 'Cobertura', value: 'Chile' },
]

const principles = [
  'Diagnóstico simple antes de iniciar cada gestión.',
  'Documentos ordenados para revisión técnica y normativa.',
  'Comunicación directa sobre avances, brechas y próximos pasos.',
]

export function History() {
  return (
    <section id="history" className="bg-white py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
        <div className="relative min-h-[420px] overflow-hidden rounded-lg bg-slate-100 shadow-sm">
          <Image
            src="/images/services/lineas-playa.png"
            alt="Equipo técnico realizando levantamiento de línea de playa en costa chilena"
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 560px, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 rounded-lg bg-white/95 p-5 shadow-lg backdrop-blur">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">SERVASMAR</p>
            <p className="mt-2 text-lg font-black text-slate-950">
              Asesoría marítima nacida en el Biobío para proyectos costeros de Chile.
            </p>
          </div>
        </div>

        <div>
          <div className="mb-5 inline-flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
            <MapPin className="h-4 w-4" />
            Empresa chilena
          </div>

          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            Cercanía local, criterio técnico y gestión ordenada.
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Desde 2021 apoyamos a empresas y proyectos vinculados al borde costero con una mirada práctica:
            entender el caso, ordenar antecedentes y acompañar la tramitación con claridad.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{fact.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{fact.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Forma de trabajo</p>
                <h3 className="text-xl font-black text-slate-950">Simple, trazable y responsable.</h3>
              </div>
            </div>

            <ul className="mt-5 grid gap-3">
              {principles.map((principle) => (
                <li key={principle} className="flex items-start gap-3 text-sm font-semibold leading-6 text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" />
                  <span>{principle}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-blue-950">
              <Anchor className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
              <p className="text-sm font-semibold leading-6">Foco en concesiones, permisos y actividad marítima.</p>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-cyan-50 p-4 text-cyan-950">
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-cyan-700" />
              <p className="text-sm font-semibold leading-6">Apoyo documental para decisiones y cumplimiento.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
