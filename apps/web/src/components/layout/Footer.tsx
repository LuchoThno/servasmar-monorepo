'use client'

import { Anchor, ArrowUp, Clock, Facebook, FileText, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from 'lucide-react'
import Image from 'next/image'

const footerLinks = {
  services: [
    { label: 'Concesiones Marítimas', href: '#services' },
    { label: 'Permisos Ambientales', href: '#services' },
    { label: 'Proyectos Portuarios', href: '#services' },
    { label: 'Consultoría Legal', href: '#services' },
    { label: 'Auditorías', href: '#services' },
    { label: 'Gestión Portuaria', href: '#services' },
  ],
  company: [
    { label: 'Nuestra Historia', href: '#history' },
    { label: 'Equipo', href: '#about' },
    { label: 'Clientes', href: '#clients' },
    { label: 'Normativas', href: '#regulations' },
    { label: 'Blog', href: '#' },
    { label: 'Casos de Éxito', href: '#' },
  ],
  legal: [
    { label: 'Aviso Legal', href: '#' },
    { label: 'Política de Privacidad', href: '#' },
    { label: 'Política de Cookies', href: '#' },
    { label: 'Términos y Condiciones', href: '#' },
    { label: 'Certificaciones', href: '#' },
  ],
}

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook', color: 'hover:bg-blue-600' },
  { icon: Linkedin, href: '#', label: 'LinkedIn', color: 'hover:bg-blue-700' },
  { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:bg-sky-500' },
  { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:bg-pink-600' },
]

const contactInfo = [
  {
    icon: Phone,
    label: 'Teléfono',
    value: '+34 963 XXX XXX',
    href: 'tel:+34963XXXXXX',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'info@servasmar.com',
    href: 'mailto:info@servasmar.com',
  },
  {
    icon: MapPin,
    label: 'Oficina',
    value: 'Puerto de Valencia, España',
    href: 'https://maps.google.com',
  },
  {
    icon: Clock,
    label: 'Horario',
    value: 'Lun - Vie: 9:00 - 18:00',
    href: null,
  },
]

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Wave decoration */}
      <div className="absolute top-0 left-0 right-0">
        <svg className="w-full h-24 fill-white" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Company Info - Solo logo */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              {/* Logo Image - Más grande */}
              <div className="relative w-20 h-20">
                <Image
                  src="/images/logo2.png"
                  alt="SERVASMAR"
                  width={80}
                  height={80}
                  className="rounded-2xl shadow-2xl"
                  onError={(e) => {
                    // Fallback si no existe la imagen
                    e.currentTarget.style.display = 'none'
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
                {/* Fallback Icon */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-2xl" style={{ display: 'none' }}>
                  <Anchor className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            <p className="text-blue-200 mb-6 leading-relaxed">
              Más de 20 años de experiencia ofreciendo servicios marítimos integrales. 
              Especialistas en concesiones, permisos ambientales y consultoría legal marítima.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => {
                const IconComponent = social.icon
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center ${social.color} transition-all duration-300 hover:scale-110 hover:shadow-lg`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </a>
                )
              })}
            </div>

            {/* Certifications */}
            <div className="mt-6 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <FileText className="w-5 h-5 text-blue-300" />
              <span className="text-sm text-blue-200">Certificado ISO 9001:2015</span>
            </div>
          </div>

          {/* Services Links */}
          <div>
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full"></div>
              Servicios
            </h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-blue-200 hover:text-white transition-colors duration-200 hover:translate-x-1 inline-flex items-center group"
                  >
                    <span className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full"></div>
              Empresa
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-blue-200 hover:text-white transition-colors duration-200 hover:translate-x-1 inline-flex items-center group"
                  >
                    <span className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full"></div>
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-blue-200 hover:text-white transition-colors duration-200 hover:translate-x-1 inline-flex items-center group"
                  >
                    <span className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact Info Bar */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-12 border border-white/20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, index) => {
              const IconComponent = info.icon
              return (
                <div key={index} className="flex items-start gap-3 group">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-blue-300 text-xs font-medium mb-1">{info.label}</p>
                    {info.href ? (
                      <a
                        href={info.href}
                        target={info.href.startsWith('http') ? '_blank' : undefined}
                        rel={info.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="text-white font-semibold text-sm hover:text-blue-300 transition-colors"
                      >
                        {info.value}
                      </a>
                    ) : (
                      <p className="text-white font-semibold text-sm">{info.value}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-blue-200 text-sm text-center md:text-left">
              © {new Date().getFullYear()} SERVASMAR - Asesorías Marítimas. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4">
              <p className="text-blue-200 text-sm">
                Diseñado con{' '}
                <span className="text-red-400">❤</span>
                {' '}para el sector marítimo
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-110 z-50 group"
        aria-label="Volver arriba"
      >
        <ArrowUp className="w-6 h-6 text-white group-hover:-translate-y-1 transition-transform" />
      </button>
    </footer>
  )
}
