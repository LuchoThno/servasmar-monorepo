import { Footer } from '@/components/layout/Footer'
import { Navigation } from '@/components/layout/Navigation'
import { Contact } from '@/components/sections/Contact'
import { Hero } from '@/components/sections/Hero'
import { History } from '@/components/sections/History'
import { Services } from '@/components/sections/Services'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <History />
        <Services />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
