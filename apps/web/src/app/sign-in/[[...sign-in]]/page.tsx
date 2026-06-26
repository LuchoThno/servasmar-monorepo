import { SignIn } from '@clerk/nextjs'
import { ArrowLeft, BadgeCheck, Building2, ShieldCheck, Waves } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const loginHighlights = [
  {
    icon: ShieldCheck,
    title: 'Acceso protegido',
    detail: 'Ingreso seguro para el equipo administrativo y operativo de SERVASMAR.',
  },
  {
    icon: Building2,
    title: 'Gestión centralizada',
    detail: 'CRM, citas, finanzas, documentos y reportes desde un solo panel.',
  },
  {
    icon: Waves,
    title: 'Contexto marítimo',
    detail: 'Flujos pensados para proyectos costeros, portuarios y de concesiones marítimas.',
  },
]

export default function Page() {
  const afterSignInUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/admin'

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/fondo-login.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(2,6,23,0.9)_10%,_rgba(15,23,42,0.72)_46%,_rgba(8,47,73,0.86)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.2),_transparent_30%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="max-w-2xl text-white">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-cyan-100 backdrop-blur transition hover:bg-white/15 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al sitio
            </Link>

            <div className="mt-8 flex items-center gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                <Image
                  src="/images/logo2.png"
                  alt="SERVASMAR"
                  width={84}
                  height={84}
                  className="h-[84px] w-[84px] object-contain"
                  priority
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-200">Panel Corporativo</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Acceso al entorno administrativo de SERVASMAR
                </h1>
              </div>
            </div>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-200 sm:text-lg">
              Un espacio privado para coordinar clientes, documentos, finanzas, citas y seguimiento operativo
              con una experiencia coherente con la identidad corporativa de la compañía.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {loginHighlights.map((item) => {
                const Icon = item.icon
                return (
                  <article
                    key={item.title}
                    className="rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-300 text-slate-950">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-base font-black text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{item.detail}</p>
                  </article>
                )
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 font-semibold text-emerald-200">
                <BadgeCheck className="h-4 w-4" />
                Acceso por roles
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 font-semibold text-cyan-100">
                Dominio corporativo y usuarios autorizados
              </span>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <div className="rounded-[30px] border border-white/10 bg-white/95 p-3 shadow-[0_30px_90px_rgba(2,6,23,0.38)] backdrop-blur">
              <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-inner">
                <SignIn
                  fallbackRedirectUrl={afterSignInUrl}
                  forceRedirectUrl={afterSignInUrl}
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      cardBox: 'w-full shadow-none',
                      card: 'shadow-none border-0 bg-transparent',
                      headerTitle: 'text-slate-950 font-black text-2xl',
                      headerSubtitle: 'text-slate-500',
                      socialButtonsBlockButton:
                        'border border-slate-200 hover:bg-slate-50 text-slate-900 shadow-none rounded-xl h-11',
                      formButtonPrimary:
                        'bg-slate-950 hover:bg-slate-800 text-white rounded-xl h-11 shadow-none',
                      formFieldInput:
                        'rounded-xl border-slate-300 focus:border-blue-700 focus:ring-blue-100 h-11',
                      footerActionLink: 'text-blue-700 hover:text-blue-800 font-semibold',
                      identityPreviewText: 'text-slate-700',
                      formFieldLabel: 'text-slate-700 font-semibold',
                      dividerLine: 'bg-slate-200',
                      dividerText: 'text-slate-400',
                    },
                  }}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
