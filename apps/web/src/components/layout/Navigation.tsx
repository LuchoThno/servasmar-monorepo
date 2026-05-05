'use client'

import { Button } from '@servasmar/ui'
import { Anchor } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { href: '#hero', label: 'Inicio', ariaLabel: 'Ir a la sección de inicio' },
    { href: '#history', label: 'Historia', ariaLabel: 'Ir a la sección de historia' },
    { href: '#services', label: 'Servicios', ariaLabel: 'Ir a la sección de servicios' },
    { href: '#regulations', label: 'Normativas', ariaLabel: 'Ir a la sección de normativas' },
    { href: '#clients', label: 'Clientes', ariaLabel: 'Ir a la sección de clientes' },
    { href: '#contact', label: 'Contacto', ariaLabel: 'Ir a la sección de contacto' },
  ]

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href) as HTMLElement | null
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      element.focus({ preventScroll: true })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-blue-100'
          : 'bg-gradient-to-b from-slate-900/90 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-24 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center group relative">
            <div
              className={`relative transition-all duration-300 ${
                isScrolled
                  ? 'w-48 h-16 sm:w-56 sm:h-20'
                  : 'w-52 h-20 sm:w-64 sm:h-24'
              }`}
            >
              <Image
                src="/images/logo3.png"
                alt="SERVASMAR"
                fill
                className={`object-contain transition-all duration-300 group-hover:scale-105 ${
                  isScrolled ? '' : 'brightness-0 invert'
                }`}
                priority
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
              {/* Fallback */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ display: 'none' }}
                aria-hidden="true"
              >
                <div
                  className={`flex items-center gap-3 transition-all duration-300 px-6 py-3 rounded-xl shadow-lg group-hover:shadow-xl group-hover:scale-105 ${
                    isScrolled
                      ? 'bg-gradient-to-br from-blue-600 to-cyan-600'
                      : 'bg-white/10 backdrop-blur-sm border-2 border-white/30'
                  }`}
                >
                  <Anchor className={`transition-all duration-300 ${isScrolled ? 'w-9 h-9 text-white' : 'w-10 h-10 text-white'}`} />
                  <span className={`font-bold tracking-tight transition-all duration-300 ${isScrolled ? 'text-lg text-white' : 'text-xl text-white'}`}>
                    SERVASMAR
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => scrollToSection(item.href)}
                aria-label={item.ariaLabel}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isScrolled
                    ? 'text-slate-700 hover:text-blue-600 hover:bg-blue-700/10'
                    : 'text-white/90 hover:text-blue-600 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
              asChild
            >
              <a href="tel:+34600000000">📞 Llamar</a>
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
              asChild
            >
              <a href="#contact">Consultar</a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
<button
  type="button"
  className={`md:hidden p-2 rounded-lg transition-colors ${
    isScrolled ? 'text-slate-700' : 'text-white'
  }`}
  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
  aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
>
  <div className="w-6 h-6 flex flex-col justify-center items-center space-y-1.5">
    <span
      className={`block w-6 h-0.5 bg-current transition-all duration-300 ${
        isMobileMenuOpen ? 'rotate-45 translate-y-2' : 'rotate-0'
      }`}
    />
    <span
      className={`block w-6 h-0.5 bg-current transition-all duration-300 ${
        isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
      }`}
    />
    <span
      className={`block w-6 h-0.5 bg-current transition-all duration-300 ${
        isMobileMenuOpen ? '-rotate-45 -translate-y-2' : 'rotate-0'
      }`}
    />
  </div>
</button>

        </div>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        role="region"
        aria-label="Menú de navegación móvil"
        className={`md:hidden border-t border-blue-100 bg-white/95 backdrop-blur-md shadow-xl transition-all duration-300 ${
          isMobileMenuOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => scrollToSection(item.href)}
              aria-label={item.ariaLabel}
              className="block w-full text-left px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {item.label}
            </button>
          ))}
          <div className="pt-4 space-y-2">
            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <a href="tel:+34600000000">📞 Llamar</a>
            </Button>
            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <a href="#contact">Consultar</a>
            </Button>
          </div>
        </div>
      </div>

    </nav>
  )
}