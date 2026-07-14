'use client'

import { Mail, Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '#hero', label: 'Inicio' },
  { href: '#process', label: 'Proceso' },
  { href: '#clients', label: 'Proyectos' },
  { href: '#contact', label: 'Contacto' },
]

export function Navigation() {
  const [isAtTop, setIsAtTop] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => {
      setIsAtTop(window.scrollY < 32)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navigateToSection = (href: string) => {
    if (pathname !== '/') {
      router.push(`/${href}`)
      setIsMobileMenuOpen(false)
      return
    }

    const element = document.querySelector(href)
    element?.scrollIntoView({ behavior: 'smooth' })
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <div
        className={`mx-auto max-w-7xl rounded-[24px] transition-all duration-300 ${
          isAtTop
            ? 'border-transparent bg-transparent'
            : 'border border-slate-200/90 bg-white shadow-[0_14px_45px_rgba(15,23,42,0.1)]'
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-6 lg:px-5">
          <Link
            href="/"
            className="relative block h-14 w-44 shrink-0 sm:h-16 sm:w-52 lg:h-[72px] lg:w-[250px] xl:h-[78px] xl:w-[270px]"
          >
            <Image
              src="/images/logo3.png"
              alt="SERVASMAR"
              fill
              priority
              className={`object-contain object-left drop-shadow-[0_6px_24px_rgba(0,0,0,0.18)] transition duration-300 ${isAtTop ? 'brightness-0 invert' : ''}`}
              sizes="270px"
            />
          </Link>

          <div className="hidden lg:flex lg:items-center lg:justify-center">
            <div
              className={`flex items-center justify-center gap-1 rounded-full px-2 py-2 xl:gap-2 ${
                isAtTop
                  ? 'bg-transparent backdrop-blur-none'
                  : 'bg-slate-50'
              }`}
            >
              {navItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navigateToSection(item.href)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition xl:px-5 ${
                    isAtTop
                      ? 'text-white/90 hover:bg-white/10 hover:text-white'
                      : 'text-slate-700 hover:bg-white hover:text-[#0E3048]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex lg:justify-end">
            <a
              href="/citas"
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold uppercase tracking-[0.08em] transition ${
                isAtTop
                  ? 'bg-[#C6A052] text-[#2b2e3a] hover:bg-[#e2c78e]'
                  : 'bg-[#C6A052] text-[#2b2e3a] hover:bg-[#b79446]'
              }`}
            >
              <Mail className="h-4 w-4" />
              Evaluar proyecto
            </a>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition lg:hidden ${
              isAtTop
                ? 'border border-transparent bg-transparent text-white'
                : 'border border-stone-300 bg-white text-stone-950'
            }`}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div
            className={`mx-3 mb-3 rounded-[22px] border p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] lg:hidden ${
              isAtTop
                ? 'border-white/12 bg-[#10283a]/96 text-white backdrop-blur-xl'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="grid gap-2">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navigateToSection(item.href)}
                  className={`rounded-[16px] px-4 py-3 text-left text-sm font-bold transition ${
                    isAtTop
                      ? 'text-white/88 hover:bg-white/8 hover:text-white'
                      : 'text-slate-800 hover:bg-slate-100 hover:text-[#0E3048]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3">
              <a
                href="/citas"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#c5a35a] text-sm font-bold uppercase tracking-[0.08em] text-[#2b2e3a]"
              >
                <Mail className="h-4 w-4" />
                Evaluar proyecto
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
