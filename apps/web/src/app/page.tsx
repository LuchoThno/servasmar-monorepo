import { Footer } from '@/components/layout/Footer'
import { Navigation } from '@/components/layout/Navigation'
import { Clients } from '@/components/sections/Clients'
import { Contact } from '@/components/sections/Contact'
import { Hero } from '@/components/sections/Hero'
import { ProjectRoute } from '@/components/sections/ProjectRoute'
import { VideoShowcase } from '@/components/sections/VideoShowcase'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <ProjectRoute />
        <VideoShowcase />
        <Clients />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
