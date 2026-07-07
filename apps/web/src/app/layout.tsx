import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://servasmar.cl'
const previewImage = '/images/banner.png'

export const metadata: Metadata = {
  title: 'SERVASMAR - Asesorías Marítimas',
  description: 'Servicios marítimos integrales con más de 20 años de experiencia',
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'SERVASMAR',
    title: 'SERVASMAR - Asesorías Marítimas',
    description: 'Servicios marítimos integrales con más de 20 años de experiencia',
    images: [
      {
        url: previewImage,
        alt: 'SERVASMAR - Asesorías Marítimas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SERVASMAR - Asesorías Marítimas',
    description: 'Servicios marítimos integrales con más de 20 años de experiencia',
    images: [previewImage],
  },
}

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up'


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ClerkProvider signInUrl={signInUrl} signUpUrl={signUpUrl}>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
