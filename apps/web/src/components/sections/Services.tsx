'use client'

import {
  Anchor,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Leaf,
  Scale,
  Shield,
  Ship,
  Waves
} from 'lucide-react'
import { useState } from 'react'

const services = [
  {
    icon: FileText,
    title: 'Tramitación de Concesiones Marítimas',
    description: 'Gestión completa de trámites para obtener concesiones marítimas, asegurando el cumplimiento de todos los requisitos legales.',
    features: [
      'Preparación de documentación técnica',
      'Gestión ante autoridades portuarias',
      'Seguimiento del expediente',
      'Renovación de concesiones',
    ],
    color: 'blue',
    popular: true,
  },
  {
    icon: Leaf,
    title: 'Gestión de Permisos Ambientales',
    description: 'Asesoría especializada en la obtención de permisos ambientales para proyectos marítimos y portuarios.',
    features: [
      'Evaluación de impacto ambiental',
      'Estudios de sostenibilidad',
      'Tramitación de permisos DIA',
      'Seguimiento ambiental',
    ],
    color: 'green',
    popular: false,
  },
  {
    icon: Ship,
    title: 'Asesoría en Proyectos Portuarios',
    description: 'Consultoría integral para el desarrollo y ejecución de infraestructuras portuarias y marítimas.',
    features: [
      'Planificación estratégica',
      'Viabilidad técnica y económica',
      'Coordinación con stakeholders',
      'Gestión de proyecto completa',
    ],
    color: 'purple',
    popular: false,
  },
  {
    icon: Scale,
    title: 'Consultoría Legal Marítima',
    description: 'Asesoramiento jurídico especializado en derecho marítimo y regulaciones portuarias.',
    features: [
      'Contratos marítimos',
      'Resolución de conflictos',
      'Compliance normativo',
      'Representación legal',
    ],
    color: 'red',
    popular: true,
  },
  {
    icon: FileCheck,
    title: 'Auditorías y Certificaciones',
    description: 'Servicios de auditoría para verificar el cumplimiento de normativas marítimas y estándares de calidad.',
    features: [
      'Auditorías de cumplimiento',
      'Certificaciones ISO',
      'Inspecciones técnicas',
      'Informes de conformidad',
    ],
    color: 'orange',
    popular: false,
  },
  {
    icon: Waves,
    title: 'Gestión Portuaria Integral',
    description: 'Soluciones completas para la gestión operativa y administrativa de instalaciones portuarias.',
    features: [
      'Optimización de operaciones',
      'Gestión de recursos',
      'Mantenimiento de instalaciones',
      'Protocolos de seguridad',
    ],
    color: 'cyan',
    popular: false,
  },
]

const colorClasses = {
  blue: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hover: 'hover:border-blue-400',
    icon: 'bg-blue-600',
    badge: 'bg-blue-600',
  },
  green: {
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
    hover: 'hover:border-green-400',
    icon: 'bg-green-600',
    badge: 'bg-green-600',
  },
  purple: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    hover: 'hover:border-purple-400',
    icon: 'bg-purple-600',
    badge: 'bg-purple-600',
  },
  red: {
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    hover: 'hover:border-red-400',
    icon: 'bg-red-600',
    badge: 'bg-red-600',
  },
  orange: {
    gradient: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    hover: 'hover:border-orange-400',
    icon: 'bg-orange-600',
    badge: 'bg-orange-600',
  },
  cyan: {
    gradient: 'from-cyan-500 to-cyan-600',
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
    hover: 'hover:border-cyan-400',
    icon: 'bg-cyan-600',
    badge: 'bg-cyan-600',
  },
}

const benefits = [
  {
    icon: Shield,
    title: 'Experiencia Comprobada',
    description: '20+ años asesorando proyectos marítimos',
  },
  {
    icon: Clock,
    title: 'Respuesta Rápida',
    description: 'Atención personalizada en 24h',
  },
  {
    icon: Award,
    title: 'Calidad Garantizada',
    description: 'Certificados ISO 9001:2015',
  },
]

export function Services() {
  const [selectedService, setSelectedService] = useState<number | null>(null)

  return (
    <section id="services" className="py-20 bg-gradient-to-b from-white via-blue-50/30 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full mb-6 shadow-lg">
            <Anchor className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Nuestros <span className="text-gradient-ocean">Servicios</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 mx-auto mb-6"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Ofrecemos una amplia gama de servicios especializados en el ámbito marítimo, 
            adaptados a las necesidades específicas de cada cliente.
          </p>
        </div>

        {/* Benefits Bar */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon
            return (
              <div
                key={index}
                className="flex items-center gap-4 bg-white rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">{benefit.title}</h4>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {services.map((service, index) => {
            const IconComponent = service.icon
            const colors = colorClasses[service.color as keyof typeof colorClasses]
            const isExpanded = selectedService === index

            return (
              <div
                key={index}
                className={`bg-white rounded-2xl border-2 ${colors.border} ${colors.hover} p-6 transition-all duration-300 hover:shadow-2xl group relative overflow-hidden ${
                  service.popular ? 'ring-2 ring-blue-600 ring-offset-4' : ''
                }`}
              >
                {/* Popular Badge */}
                {service.popular && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Popular
                  </div>
                )}

                {/* Background gradient on hover */}
                <div className={`absolute inset-0 ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${colors.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {service.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Features List */}
                  <div className={`space-y-2 mb-4 transition-all duration-300 ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                  }`}>
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={() => setSelectedService(isExpanded ? null : index)}
                    className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${colors.gradient} text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transition-all duration-300 group/btn`}
                  >
                    {isExpanded ? 'Ver menos' : 'Ver detalles'}
                    <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${
                      isExpanded ? 'rotate-90' : 'group-hover/btn:translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA Section */}
<div className="relative rounded-3xl overflow-hidden shadow-2xl">
  {/* Background image */}
  <div 
    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style={{
      backgroundImage: `url('https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&q=80')`,
    }}
  />
  {/* Overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-blue-900/85 to-slate-900/90" />
  
  <div className="relative z-10 text-white p-8 md:p-12 text-center">
    <h3 className="text-3xl md:text-4xl font-bold mb-4">
      ¿No encuentras el servicio que necesitas?
    </h3>
    <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">
      Ofrecemos soluciones personalizadas para proyectos marítimos únicos. 
      Contáctanos y cuéntanos tu proyecto.
    </p>
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <button
        onClick={() => {
          document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
        }}
        className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
      >
        Consulta Personalizada
        <ArrowRight className="w-5 h-5" />
      </button>
      <a
        href="https://wa.me/56965698527?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20más%20información%20sobre%20sus%20servicios%20marítimos"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 border-2 border-green-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Llámanos por WhatsApp
      </a>
    </div>
  </div>
</div>
      </div>
    </section>
  )
}
