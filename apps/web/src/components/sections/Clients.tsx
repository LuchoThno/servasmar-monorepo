"use client"

import { ArrowRight, Award, Building2, CheckCircle2, Quote, Star, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

const clients = [
  {
    name: 'Naviera Marítima S.A.',
    industry: 'Transporte Marítimo',
    logo: '🚢',
    testimonial: 'SERVASMAR nos ha ayudado a gestionar todas nuestras concesiones portuarias con profesionalidad y eficiencia excepcionales.',
    rating: 5,
    project: 'Concesión portuaria Valencia',
  },
  {
    name: 'Puerto Industrial BCN',
    industry: 'Infraestructura Portuaria',
    logo: '⚓',
    testimonial: 'Su experiencia en permisos ambientales fue clave para aprobar nuestro proyecto de expansión en tiempo récord.',
    rating: 5,
    project: 'Evaluación ambiental',
  },
  {
    name: 'Shipping Logistics Group',
    industry: 'Logística Marítima',
    logo: '📦',
    testimonial: 'Profesionales altamente cualificados que entienden las necesidades del sector marítimo. Altamente recomendables.',
    rating: 5,
    project: 'Asesoría legal marítima',
  },
  {
    name: 'Astilleros del Mediterráneo',
    industry: 'Construcción Naval',
    logo: '🔧',
    testimonial: 'Gracias a SERVASMAR obtuvimos todas las certificaciones necesarias sin complicaciones. Servicio impecable.',
    rating: 5,
    project: 'Certificaciones ISO',
  },
  {
    name: 'Marina Deportiva Costa Azul',
    industry: 'Puertos Deportivos',
    logo: '⛵',
    testimonial: 'Su conocimiento del marco legal marítimo nos ayudó a expandir nuestras instalaciones cumpliendo toda la normativa.',
    rating: 5,
    project: 'Ampliación de marina',
  },
  {
    name: 'Pesquera Atlántica',
    industry: 'Industria Pesquera',
    logo: '🐟',
    testimonial: 'Excelente asesoramiento en la renovación de nuestras licencias de pesca. Trato cercano y profesional.',
    rating: 5,
    project: 'Renovación de licencias',
  },
]

const stats = [
  { number: '150+', label: 'Clientes Satisfechos', icon: Users },
  { number: '500+', label: 'Proyectos Completados', icon: Award },
  { number: '98%', label: 'Tasa de Éxito', icon: TrendingUp },
  { number: '20+', label: 'Años de Experiencia', icon: Star },
]

const industries = [
  { name: 'Transporte Marítimo', count: 45, icon: '🚢' },
  { name: 'Puertos y Terminales', count: 38, icon: '⚓' },
  { name: 'Construcción Naval', count: 28, icon: '🔧' },
  { name: 'Energía Offshore', count: 22, icon: '⚡' },
  { name: 'Pesca y Acuicultura', count: 17, icon: '🐟' },
  { name: 'Turismo Náutico', count: 25, icon: '⛵' },
]

export function Clients() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % clients.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="clients" className="py-20 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mb-6 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Nuestros <span className="text-gradient-ocean">Clientes</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 mx-auto mb-6"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Trabajamos con las principales empresas del sector marítimo español, 
            construyendo relaciones de confianza a largo plazo.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-blue-100 text-center group"
              >
                <IconComponent className="w-10 h-10 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
              </div>
            )
          })}
        </div>

        {/* Featured Testimonial Carousel */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>

            <div className="relative z-10">
              <Quote className="w-16 h-16 text-white/30 mb-6" />
              
              <div className="transition-all duration-500">
                <p className="text-xl md:text-2xl text-white font-medium mb-6 leading-relaxed">
                  "{clients[currentTestimonial].testimonial}"
                </p>

                <div className="flex items-center gap-4 mb-4">
                  <div className="text-5xl">{clients[currentTestimonial].logo}</div>
                  <div>
                    <h4 className="text-xl font-bold text-white">
                      {clients[currentTestimonial].name}
                    </h4>
                    <p className="text-blue-200">
                      {clients[currentTestimonial].industry}
                    </p>
                    <div className="flex gap-1 mt-2">
                      {[...Array(clients[currentTestimonial].rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {clients[currentTestimonial].project}
                </div>
              </div>

              {/* Navigation dots */}
              <div className="flex justify-center gap-2 mt-8">
                {clients.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentTestimonial
                        ? 'bg-white w-8'
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`Ver testimonio ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Industries Served */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Industrias que Servimos
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((industry, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-blue-100 text-center group cursor-pointer"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                  {industry.icon}
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-2">
                  {industry.name}
                </h4>
                <p className="text-xs text-gray-600">
                  {industry.count} clientes
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Client Logos Grid */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-blue-100 mb-16">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Empresas que Confían en Nosotros
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {clients.map((client, index) => (
              <div
                key={index}
                className="flex items-center justify-center p-4 rounded-xl hover:bg-blue-50 transition-all duration-300 group cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-5xl mb-2 group-hover:scale-110 transition-transform">
                    {client.logo}
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    {client.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-3xl p-8 md:p-12 text-white text-center shadow-2xl">
          <Award className="w-16 h-16 mx-auto mb-6 text-yellow-400" />
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Quieres Unirte a Nuestros Clientes Exitosos?
          </h3>
          <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">
            Más de 150 empresas confían en SERVASMAR para sus proyectos marítimos. 
            Descubre cómo podemos ayudarte a alcanzar tus objetivos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Solicitar Consulta Gratuita
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300"
            >
              Ver Nuestros Servicios
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
