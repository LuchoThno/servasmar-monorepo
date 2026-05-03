"use client"

import { Anchor, Award, Calendar, Globe, Ship, TrendingUp, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'

const milestones = [
  {
    year: '2003',
    icon: Anchor,
    title: 'Fundación de SERVASMAR',
    description: 'Nace SERVASMAR con la visión de ofrecer servicios marítimos integrales de excelencia. Comenzamos operaciones en el puerto de Valencia con un equipo dedicado de profesionales del sector náutico.',
  },
  {
    year: '2007',
    icon: Ship,
    title: 'Especialización en Tramitación Marítima',
    description: 'Consolidamos nuestra experiencia en tramitación de concesiones marítimas y permisos ambientales, convirtiéndonos en referentes del sector en la costa mediterránea.',
  },
  {
    year: '2010',
    icon: TrendingUp,
    title: 'Expansión a Puertos Nacionales',
    description: 'Ampliamos nuestra presencia a los principales puertos españoles: Barcelona, Tarragona, Alicante y Castellón. Superamos los 200 proyectos completados exitosamente.',
  },
  {
    year: '2014',
    icon: Users,
    title: 'Crecimiento del Equipo',
    description: 'Incorporamos especialistas en derecho marítimo, ingeniería portuaria y gestión ambiental, fortaleciendo nuestra capacidad de atención integral a nuestros clientes.',
  },
  {
    year: '2017',
    icon: Award,
    title: 'Certificación ISO 9001:2015',
    description: 'Obtención de la certificación ISO 9001:2015 en gestión de calidad, ratificando nuestro compromiso con la excelencia y la mejora continua en todos nuestros procesos.',
  },
  {
    year: '2020',
    icon: Globe,
    title: 'Proyectos Internacionales',
    description: 'Iniciamos colaboraciones con empresas navieras internacionales y participamos en proyectos portuarios en el Mediterráneo y Norte de África, consolidando nuestra reputación internacional.',
  },
  {
    year: '2024',
    icon: TrendingUp,
    title: 'Líderes del Sector',
    description: 'Más de 500 proyectos completados, 20+ años de experiencia y un equipo de expertos dedicados. SERVASMAR se posiciona como líder en asesoría marítima integral en España.',
  },
]

const stats = [
  { number: '20+', label: 'Años de Experiencia', icon: Calendar },
  { number: '500+', label: 'Proyectos Completados', icon: Award },
  { number: '100%', label: 'Satisfacción del Cliente', icon: TrendingUp },
  { number: '15+', label: 'Profesionales Expertos', icon: Users },
]

export function History() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-up')
          }
        })
      },
      { threshold: 0.1 }
    )

    const elements = sectionRef.current?.querySelectorAll('.timeline-item, .stat-card')
    elements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="history" className="py-20 bg-gradient-to-b from-white via-blue-50/30 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
            <Ship className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Nuestra <span className="text-gradient-ocean">Trayectoria</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 mx-auto mb-6"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Dos décadas de excelencia en el sector marítimo español, construyendo confianza y 
            ofreciendo soluciones integrales a nuestros clientes.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div
                key={index}
                className="stat-card opacity-0 bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-blue-100"
              >
                <IconComponent className="w-8 h-8 text-blue-600 mb-3 mx-auto" />
                <div className="text-3xl md:text-4xl font-bold text-blue-900 mb-2">{stat.number}</div>
                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
              </div>
            )
          })}
        </div>

        {/* Timeline */}
        <div className="relative max-w-6xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-8 md:left-1/2 transform md:-translate-x-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-blue-400 to-blue-200 hidden sm:block"></div>

          {milestones.map((milestone, index) => {
            const IconComponent = milestone.icon
            const isEven = index % 2 === 0

            return (
              <div
                key={index}
                className={`timeline-item relative mb-12 md:mb-16 opacity-0`}
              >
                <div className={`flex flex-col md:flex-row items-start md:items-center gap-6 ${
                  isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}>
                  {/* Content */}
                  <div className={`flex-1 ${isEven ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'}`}>
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-blue-600 hover:-translate-y-1 group">
                      <div className={`flex items-center gap-3 mb-4 ${isEven ? 'md:justify-end' : 'md:justify-start'}`}>
                        <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-full">
                          <IconComponent className="w-5 h-5 text-blue-600" />
                          <span className="text-2xl font-bold text-blue-600">{milestone.year}</span>
                        </div>
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                        {milestone.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {milestone.description}
                      </p>
                    </div>
                  </div>

                  {/* Center dot */}
                  <div className="absolute left-8 md:left-1/2 transform md:-translate-x-1/2 -translate-y-2 md:translate-y-0">
                    <div className="w-4 h-4 md:w-6 md:h-6 bg-blue-600 rounded-full border-4 border-white shadow-lg ring-4 ring-blue-100"></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Call to Action */}
        <div className="mt-20 text-center bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-12 shadow-2xl">
          <h3 className="text-3xl font-bold text-white mb-4">
            ¿Listo para trabajar con los mejores?
          </h3>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Únete a más de 500 clientes satisfechos que confían en SERVASMAR para sus proyectos marítimos.
          </p>
          <button
            onClick={() => {
              document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
          >
            Solicita una Consulta Gratuita
            <Anchor className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  )
}
