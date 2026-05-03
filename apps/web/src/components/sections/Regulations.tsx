'use client'

import { AlertCircle, BookOpen, CheckCircle2, ExternalLink, FileText, Scale, Shield, Waves } from 'lucide-react'
import { useState } from 'react'

const regulations = [
  {
    icon: Waves,
    title: 'Ley de Puertos del Estado',
    description: 'Normativa que regula el sistema portuario español y las actividades en puertos de interés general.',
    details: 'Real Decreto Legislativo 2/2011, de 5 de septiembre',
    link: '#',
    category: 'Legislación Portuaria',
    color: 'blue',
  },
  {
    icon: Shield,
    title: 'Ley de Costas',
    description: 'Regulación del uso y protección del dominio público marítimo-terrestre.',
    details: 'Ley 22/1988, de 28 de julio (actualizada)',
    link: '#',
    category: 'Protección Ambiental',
    color: 'green',
  },
  {
    icon: Scale,
    title: 'Ley de Navegación Marítima',
    description: 'Marco jurídico para las actividades de navegación y transporte marítimo en España.',
    details: 'Ley 14/2014, de 24 de julio',
    link: '#',
    category: 'Navegación',
    color: 'purple',
  },
  {
    icon: FileText,
    title: 'Normativa de Concesiones',
    description: 'Regulación de concesiones administrativas en zonas de servicio portuario.',
    details: 'Real Decreto 1414/2018',
    link: '#',
    category: 'Legislación Portuaria',
    color: 'blue',
  },
  {
    icon: BookOpen,
    title: 'Evaluación Ambiental',
    description: 'Normativa sobre evaluación de impacto ambiental en proyectos marítimos.',
    details: 'Ley 21/2013, de 9 de diciembre',
    link: '#',
    category: 'Protección Ambiental',
    color: 'green',
  },
  {
    icon: AlertCircle,
    title: 'Seguridad Marítima',
    description: 'Convenios internacionales SOLAS, MARPOL y normativa de seguridad en el mar.',
    details: 'Normativa OMI y transposición UE',
    link: '#',
    category: 'Seguridad',
    color: 'red',
  },
]

const categories = [
  { name: 'Todas', value: 'all' },
  { name: 'Legislación Portuaria', value: 'Legislación Portuaria' },
  { name: 'Protección Ambiental', value: 'Protección Ambiental' },
  { name: 'Navegación', value: 'Navegación' },
  { name: 'Seguridad', value: 'Seguridad' },
]

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'bg-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    hover: 'hover:border-blue-400',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'bg-green-600',
    badge: 'bg-green-100 text-green-700',
    hover: 'hover:border-green-400',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'bg-purple-600',
    badge: 'bg-purple-100 text-purple-700',
    hover: 'hover:border-purple-400',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'bg-red-600',
    badge: 'bg-red-100 text-red-700',
    hover: 'hover:border-red-400',
  },
}

export function Regulations() {
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredRegulations = selectedCategory === 'all'
    ? regulations
    : regulations.filter(reg => reg.category === selectedCategory)

  return (
    <section id="regulations" className="py-20 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mb-6 shadow-lg">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Normativas <span className="text-gradient-ocean">Marítimas</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 mx-auto mb-6"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Conoce el marco legal que regula las actividades marítimas en España. 
            Nuestros expertos te guían en el cumplimiento normativo.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                selectedCategory === category.value
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Regulations Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {filteredRegulations.map((regulation, index) => {
            const IconComponent = regulation.icon
            const colors = colorClasses[regulation.color as keyof typeof colorClasses]

            return (
              <div
                key={index}
                className={`bg-white rounded-2xl border-2 ${colors.border} ${colors.hover} p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group relative overflow-hidden`}
              >
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-14 h-14 ${colors.icon} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>

                  {/* Category Badge */}
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${colors.badge}`}>
                    {regulation.category}
                  </span>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {regulation.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {regulation.description}
                  </p>

                  {/* Details */}
                  <p className="text-sm text-gray-500 mb-4 italic">
                    {regulation.details}
                  </p>

                  {/* Link */}
                  <a
                    href={regulation.link}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm group/link"
                  >
                    Ver más detalles
                    <ExternalLink className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-3xl p-8 md:p-12 shadow-2xl text-white relative overflow-hidden">
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl md:text-4xl font-bold mb-4">
                ¿Necesitas Asesoría Legal Marítima?
              </h3>
              <p className="text-blue-100 text-lg mb-6">
                Nuestro equipo de expertos te ayuda a navegar por el complejo marco normativo marítimo español.
              </p>
              <ul className="space-y-3">
                {[
                  'Análisis de cumplimiento normativo',
                  'Tramitación de licencias y permisos',
                  'Asesoría en concesiones marítimas',
                  'Representación ante autoridades',
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-300 flex-shrink-0" />
                    <span className="text-white font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="w-full bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Solicitar Consulta Gratuita
                <ExternalLink className="w-5 h-5" />
              </button>
              <div className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-6 h-6 text-white" />
                  <span className="font-semibold text-lg">Garantía de Cumplimiento</span>
                </div>
                <p className="text-blue-100 text-sm">
                  Aseguramos el cumplimiento de todas las normativas aplicables a tu proyecto marítimo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
