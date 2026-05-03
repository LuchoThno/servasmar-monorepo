import { Footer } from '@/components/layout/Footer'
import { Navigation } from '@/components/layout/Navigation'
import { Clients } from '@/components/sections/Clients'
import { Contact } from '@/components/sections/Contact'
import { Hero } from '@/components/sections/Hero'
import { History } from '@/components/sections/History'
import { Regulations } from '@/components/sections/Regulations'
import { Services } from '@/components/sections/Services'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <History />
        <Services />
        <Regulations />
        <Clients />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
