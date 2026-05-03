'use client'

import { ArrowRight } from 'lucide-react'
import Image from 'next/image'

export function Hero() {
  const scrollToContact = () => {
    const element = document.querySelector('#contact') as HTMLElement
    if (element) element.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToServices = () => {
    const element = document.querySelector('#services') as HTMLElement
    if (element) element.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/banner.png"
          alt="Puerto marítimo - SERVASMAR"
          fill
          className="object-cover object-center"
          priority
          quality={75}
          sizes="100vw"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/75 via-blue-900/70 to-slate-900/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/60" />
      </div>

      {/* Fallback */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 -z-10" />

      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[100px] animate-pulse-slow animation-delay-2000" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-24">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6 text-center lg:text-left space-y-8">


          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex justify-center mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-400 pt-4 w-full max-w-md">
            <button
              onClick={scrollToServices}
              className="sm:w-auto inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-2xl shadow-blue-500/60 hover:shadow-blue-500/80 hover:-translate-y-1 transition-all duration-300 text-lg px-10 py-5 rounded-xl font-bold group relative overflow-hidden whitespace-nowrap"
            >
              <span className="relative z-10 flex items-center">
                Nuestros Servicios
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={scrollToContact}
              className="sm:w-auto inline-flex items-center justify-center border-3 border-white bg-white/10 backdrop-blur-md text-white hover:bg-white hover:text-blue-900 text-lg px-10 py-5 rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 shadow-xl whitespace-nowrap"
            >
              Contactar Ahora
            </button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-20">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-11 border-2 border-white/70 rounded-full flex items-start justify-center p-2 bg-white/10">
            <div className="w-1.5 h-3 bg-white rounded-full animate-scroll" />
          </div>
          <span className="text-white/70 text-xs font-bold">Scroll</span>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% {background-position: 0% 50%;}
          50% {background-position: 100% 50%;}
        @keyframes scroll {
          0% { transform: translateY(0); opacity: 0 }
          40% { opacity: 1 }
          100% { transform: translateY(14px); opacity: 0 }
        }
        @keyframes pulse-slow {
          0%,100% { opacity: .3; transform: scale(1) }
          50% { opacity: .5; transform: scale(1.05) }
        }
        .animate-scroll { animation: scroll 2s infinite }
        .animate-pulse-slow { animation: pulse-slow 8s infinite }
        .animation-delay-2000 { animation-delay: 2s }
      `}</style>
    </section>
  )
}
