'use client'

import {
  AlertCircle,
  BookOpen,
  ExternalLink,
  FileText,
  Scale,
  Shield,
  Waves
} from 'lucide-react'
import { useMemo, useState } from 'react'

type ColorKey = 'blue' | 'green' | 'purple' | 'red'

interface Regulation {
  icon: any
  title: string
  description: string
  details: string
  link: string
  category: string
  color: ColorKey
}

const regulations: Regulation[] = [
  {
    icon: Waves,
    title: 'Ley de Puertos de Chile',
    description:
      'Regula el sistema portuario estatal, concesiones y operación de puertos en Chile.',
    details: 'Ley N° 19.542',
    link: 'https://www.bcn.cl/leychile/navegar?idNorma=30785',
    category: 'Legislación Portuaria',
    color: 'blue',
  },
  {
    icon: Shield,
    title: 'Autoridad Marítima (DIRECTEMAR)',
    description:
      'Normativa y fiscalización de seguridad marítima, navegación y protección del medio marino.',
    details: 'DGTM y MM - DIRECTEMAR',
    link: 'https://www.directemar.cl',
    category: 'Seguridad',
    color: 'red',
  },
  {
    icon: Scale,
    title: 'Convenio SOLAS',
    description:
      'Norma internacional para la seguridad de la vida humana en el mar.',
    details: 'SOLAS 1974 - OMI',
    link: 'https://www.imo.org/en/About/Conventions/Pages/SOLAS.aspx',
    category: 'Seguridad',
    color: 'red',
  },
  {
    icon: FileText,
    title: 'Código ISPS',
    description:
      'Establece medidas de protección para buques e instalaciones portuarias.',
    details: 'Código Internacional para la Protección de Buques e Instalaciones Portuarias',
    link: 'https://www.imo.org/en/OurWork/Security/Pages/ISPSCode.aspx',
    category: 'Seguridad',
    color: 'red',
  },
  {
    icon: BookOpen,
    title: 'Convenio MARPOL',
    description:
      'Regulación internacional para prevenir la contaminación por los buques.',
    details: 'MARPOL 73/78',
    link: 'https://www.imo.org/en/About/Conventions/Pages/International-Convention-for-the-Prevention-of-Pollution-from-Ships-(MARPOL).aspx',
    category: 'Protección Ambiental',
    color: 'green',
  },
  {
    icon: AlertCircle,
    title: 'Convenio STCW',
    description:
      'Normas internacionales sobre formación, titulación y guardia de la gente de mar.',
    details: 'STCW 1978 (enmendado)',
    link: 'https://www.imo.org/en/About/Conventions/Pages/STCW.aspx',
    category: 'Navegación',
    color: 'purple',
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

  const filteredRegulations = useMemo(() => {
    return selectedCategory === 'all'
      ? regulations
      : regulations.filter((reg) => reg.category === selectedCategory)
  }, [selectedCategory])

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Scale className="w-10 h-10 mx-auto text-blue-600 mb-4" />
          <h2 className="text-4xl font-bold mb-4">
            Normativas Marítimas en Chile
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Marco legal chileno y convenios internacionales que regulan la
            actividad marítima y portuaria.
          </p>
        </div>
{/* Filtros */}
<div className="flex flex-wrap justify-center gap-3 mb-10">
  {categories.map((category) => {
    const isSelected = selectedCategory === category.value

    return (
      <button
        key={category.value}
        type="button"
        onClick={() => setSelectedCategory(category.value)}
        className={`px-5 py-2 rounded-full border transition ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:border-blue-400'
        }`}
      >
        {category.name}
      </button>
    )
  })}
</div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRegulations.map((regulation) => {
            const Icon = regulation.icon
            const colors = colorClasses[regulation.color]

            return (
              <div
                key={regulation.title}
                className={`p-6 rounded-xl border ${colors.border} hover:shadow-lg transition`}
              >
                <Icon className="w-8 h-8 mb-3 text-white bg-blue-600 p-1 rounded" />

                <span className={`text-xs px-2 py-1 rounded ${colors.badge}`}>
                  {regulation.category}
                </span>

                <h3 className="font-bold text-lg mt-3">
                  {regulation.title}
                </h3>

                <p className="text-sm text-gray-600 mt-2">
                  {regulation.description}
                </p>

                <p className="text-xs text-gray-500 mt-2 italic">
                  {regulation.details}
                </p>

                <a
                  href={regulation.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ver detalles de ${regulation.title}`}
                  className="flex items-center gap-1 text-blue-600 mt-4 text-sm"
                >
                  Ver más <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )
          })}
        </div>

        {/* Estado vacío */}
        {filteredRegulations.length === 0 && (
          <p className="text-center text-gray-500 mt-10">
            No hay normativas en esta categoría
          </p>
        )}

        {/* CTA */}
        <div className="mt-16 bg-blue-600 text-white p-8 rounded-xl text-center">
          <h3 className="text-2xl font-bold mb-3">
            ¿Necesitas asesoría marítima?
          </h3>
          <p className="mb-5">
            Te ayudamos a cumplir con normativa nacional e internacional.
          </p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                document
                  .querySelector('#contact')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold"
          >
            Solicitar asesoría
          </button>
        </div>
      </div>
    </section>
  )
}