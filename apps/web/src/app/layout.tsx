import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'SERVASMAR - Asesorías Marítimas',
  description: 'Servicios marítimos integrales con más de 20 años de experiencia',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es" className="scroll-smooth" suppressHydrationWarning>
        <body className="antialiased" suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
