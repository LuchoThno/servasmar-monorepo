'use client'

export function VideoShowcase() {
  return (
    <section className="py-20 sm:py-24">
      <div className="section-shell">
        <div className="mx-auto max-w-5xl text-center">
          <div className="section-kicker justify-center border-0 pl-0">Contexto en terreno</div>
          <h2 className="section-title mt-6 text-balance">
            El entorno donde se toman estas decisiones también debe poder leerse con precisión.
          </h2>
          <p className="section-copy mt-6">
            Mostramos el contexto real de operación, infraestructura y borde costero porque la
            calidad del análisis también depende de comprender el terreno, sus restricciones y su
            condición actual.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-[32px] border border-[#0f2334] bg-[#071A2B] p-4 shadow-[0_30px_80px_rgba(7,26,43,0.14)] sm:p-5">
          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black">
            <video
              className="block h-auto w-full"
              controls
              preload="metadata"
              playsInline
              aria-label="Video de contexto marítimo y costero de SERVASMAR"
            >
              <source src="/videos/video-servasmar.mp4" type="video/mp4" />
              Tu navegador no soporta la reproducción de video.
            </video>
          </div>
        </div>
      </div>
    </section>
  )
}
